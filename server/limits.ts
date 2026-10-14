import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Ограничения расходов: дневной лимит (с сохранением на диск), лимиты по адресу и по уроку, параллельные запросы. */
export class Limits {
  private ip = new Map<string, number[]>()
  private session = new Map<string, number>()
  private active = 0
  private total = 0
  private day = { date: '', count: 0 }

  constructor(private file: string | null = null) {
    this.loadDay()
  }

  private today() {
    return new Date().toISOString().slice(0, 10)
  }
  private loadDay() {
    if (!this.file || !existsSync(this.file)) return
    try {
      const d = JSON.parse(readFileSync(this.file, 'utf8'))
      if (d?.date === this.today()) this.day = d
    } catch {
      /* повреждённый файл — начинаем со счётчика 0 за сегодня */
    }
  }
  private saveDay() {
    if (!this.file) return
    try {
      mkdirSync(dirname(this.file), { recursive: true })
      writeFileSync(this.file, JSON.stringify(this.day))
    } catch {
      /* без записи на диск лимит продолжает работать в памяти */
    }
  }
  private rollDay() {
    if (this.day.date !== this.today()) this.day = { date: this.today(), count: 0 }
  }

  sessionUsed(sid: string) {
    return this.session.get(sid) ?? 0
  }
  dailyUsed() {
    this.rollDay()
    return this.day.count
  }

  /** Резервирует одну генерацию или возвращает причину отказа. */
  reserve(ip: string, sid: string, cfg: { dailyLimit: number; totalLimit?: number; hourlyPerIp: number; sessionLimit: number; maxConcurrent: number }): { ok: true } | { ok: false; code: 'daily_limit' | 'ip_limit' | 'session_limit' | 'busy' } {
    this.rollDay()
    if (cfg.totalLimit && this.total >= cfg.totalLimit) return { ok: false, code: 'daily_limit' }
    if (this.day.count >= cfg.dailyLimit) return { ok: false, code: 'daily_limit' }
    if (this.sessionUsed(sid) >= cfg.sessionLimit) return { ok: false, code: 'session_limit' }
    const now = Date.now()
    const hits = (this.ip.get(ip) ?? []).filter((t) => now - t < 3_600_000)
    if (hits.length >= cfg.hourlyPerIp) return { ok: false, code: 'ip_limit' }
    if (this.active >= cfg.maxConcurrent) return { ok: false, code: 'busy' }
    hits.push(now)
    this.ip.set(ip, hits)
    this.session.set(sid, this.sessionUsed(sid) + 1)
    this.day.count += 1
    this.total += 1
    this.active += 1
    this.saveDay()
    return { ok: true }
  }

  release(ip: string, sid: string, refund: boolean) {
    this.active = Math.max(0, this.active - 1)
    if (!refund) return
    this.day.count = Math.max(0, this.day.count - 1)
    this.total = Math.max(0, this.total - 1)
    this.session.set(sid, Math.max(0, this.sessionUsed(sid) - 1))
    const hits = this.ip.get(ip) ?? []
    hits.pop()
    this.ip.set(ip, hits)
    this.saveDay()
  }
}
