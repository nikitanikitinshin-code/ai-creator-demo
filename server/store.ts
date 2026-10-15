import { createHash } from 'node:crypto'
import { Limits } from './limits'

export interface LimitCfg {
  dailyLimit: number
  totalLimit?: number
  hourlyPerIp: number
  sessionLimit: number
  maxConcurrent: number
}
export type ReserveResult = { ok: true } | { ok: false; code: 'daily_limit' | 'ip_limit' | 'session_limit' | 'busy' }

/**
 * Хранилище счётчиков расходов. Для сервера в памяти (dev, Render) и для общего Redis (Vercel):
 * в бессерверной среде каждый запрос может идти в новом экземпляре, поэтому счётчики должны быть общими и атомарными.
 */
export interface LimitStore {
  reserve(ip: string, sid: string, cfg: LimitCfg): Promise<ReserveResult>
  release(ip: string, sid: string, refund: boolean): Promise<void>
  sessionUsed(sid: string): Promise<number>
  /** true — этот идентификатор запроса видим впервые (защита от повторов) */
  once(requestId: string): Promise<boolean>
}

export class MemoryStore implements LimitStore {
  private seen = new Map<string, number>()
  readonly limits: Limits
  constructor(usageFile: string | null) {
    this.limits = new Limits(usageFile)
  }
  async reserve(ip: string, sid: string, cfg: LimitCfg): Promise<ReserveResult> {
    return this.limits.reserve(ip, sid, cfg)
  }
  async release(ip: string, sid: string, refund: boolean) {
    this.limits.release(ip, sid, refund)
  }
  async sessionUsed(sid: string) {
    return this.limits.sessionUsed(sid)
  }
  async once(id: string) {
    const now = Date.now()
    for (const [k, t] of this.seen) if (now - t > 600_000) this.seen.delete(k)
    if (this.seen.has(id)) return false
    this.seen.set(id, now)
    return true
  }
}

// ---------- Upstash Redis (REST) ----------
export const RESERVE = `
local day=tonumber(redis.call('GET',KEYS[1]) or '0')
local total=tonumber(redis.call('GET',KEYS[2]) or '0')
local sess=tonumber(redis.call('GET',KEYS[3]) or '0')
local ip=tonumber(redis.call('GET',KEYS[4]) or '0')
local act=tonumber(redis.call('GET',KEYS[5]) or '0')
if tonumber(ARGV[2])>0 and total>=tonumber(ARGV[2]) then return 'daily_limit' end
if day>=tonumber(ARGV[1]) then return 'daily_limit' end
if sess>=tonumber(ARGV[3]) then return 'session_limit' end
if ip>=tonumber(ARGV[4]) then return 'ip_limit' end
if act>=tonumber(ARGV[5]) then return 'busy' end
redis.call('INCR',KEYS[1]); redis.call('EXPIRE',KEYS[1],ARGV[6])
redis.call('INCR',KEYS[2])
redis.call('INCR',KEYS[3]); redis.call('EXPIRE',KEYS[3],ARGV[7])
redis.call('INCR',KEYS[4]); redis.call('EXPIRE',KEYS[4],ARGV[8])
redis.call('INCR',KEYS[5]); redis.call('EXPIRE',KEYS[5],ARGV[9])
return 'ok'
`
export const RELEASE = `
local act=tonumber(redis.call('GET',KEYS[5]) or '0')
if act>0 then redis.call('DECR',KEYS[5]) end
if ARGV[1]=='1' then
  for i=1,4 do
    local v=tonumber(redis.call('GET',KEYS[i]) or '0')
    if v>0 then redis.call('DECR',KEYS[i]) end
  end
end
return 'ok'
`

export class UpstashStore implements LimitStore {
  constructor(private url: string, private token: string, private salt: string, private fetcher: typeof fetch = fetch) {}

  private async cmd(args: (string | number)[]): Promise<unknown> {
    const r = await this.fetcher(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      // Redis принимает аргументы строками
      body: JSON.stringify(args.map(String)),
    })
    if (!r.ok) throw new Error(`store_http_${r.status}`)
    const data = (await r.json()) as { result?: unknown; error?: string }
    if (data.error) throw new Error('store_error')
    return data.result
  }

  /** Адрес и номер урока в Redis хранятся только в виде хэша. */
  private h(s: string) {
    return createHash('sha256').update(`${this.salt}:${s}`).digest('hex').slice(0, 24)
  }
  private keys(ip: string, sid: string) {
    const day = new Date().toISOString().slice(0, 10)
    return [`fal:day:${day}`, 'fal:total', `fal:sess:${this.h(sid)}`, `fal:ip:${this.h(ip)}`, 'fal:active']
  }

  async reserve(ip: string, sid: string, cfg: LimitCfg): Promise<ReserveResult> {
    const res = await this.cmd([
      'EVAL', RESERVE, 5, ...this.keys(ip, sid),
      cfg.dailyLimit, cfg.totalLimit ?? 0, cfg.sessionLimit, cfg.hourlyPerIp, cfg.maxConcurrent,
      172_800, 172_800, 3600, 120,
    ])
    if (res === 'ok') return { ok: true }
    if (res === 'daily_limit' || res === 'ip_limit' || res === 'session_limit' || res === 'busy') return { ok: false, code: res }
    throw new Error('store_unexpected')
  }
  async release(ip: string, sid: string, refund: boolean) {
    await this.cmd(['EVAL', RELEASE, 5, ...this.keys(ip, sid), refund ? '1' : '0'])
  }
  async sessionUsed(sid: string) {
    const v = await this.cmd(['GET', `fal:sess:${this.h(sid)}`])
    return Number(v ?? 0) || 0
  }
  async once(id: string) {
    return (await this.cmd(['SET', `fal:req:${this.h(id)}`, '1', 'NX', 'EX', 600])) === 'OK'
  }
}

/** Общий Redis из переменных окружения Vercel/Upstash; null — если не подключён. */
export function upstashFromEnv(env: Record<string, string | undefined>): UpstashStore | null {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new UpstashStore(url, token, env.FAL_KEY ?? 'salt')
}
