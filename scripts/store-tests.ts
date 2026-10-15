/* Проверка Lua-скриптов счётчиков для Redis на настоящей Lua-машине (fengari) и поведения UpstashStore без сети. */
// @ts-ignore: у fengari нет типов
import fengari from 'fengari'
import { RELEASE, RESERVE, UpstashStore } from '../server/store'

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari
let failed = 0
const ok = (name: string, cond: boolean, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`)
  if (!cond) failed++
}

/** Минимальная имитация Redis: GET, INCR, DECR, EXPIRE, SET NX EX — как в настоящем Redis. */
class FakeRedis {
  data = new Map<string, string>()
  ttl = new Map<string, number>()
  call(cmd: string, ...a: string[]): string | number | false {
    switch (cmd.toUpperCase()) {
      case 'GET': return this.data.get(a[0]) ?? false
      case 'INCR': { const v = Number(this.data.get(a[0]) ?? 0) + 1; this.data.set(a[0], String(v)); return v }
      case 'DECR': { const v = Number(this.data.get(a[0]) ?? 0) - 1; this.data.set(a[0], String(v)); return v }
      case 'EXPIRE': this.ttl.set(a[0], Number(a[1])); return 1
      default: throw new Error('команда не поддерживается: ' + cmd)
    }
  }
}

function runLua(script: string, keys: string[], argv: (string | number)[], db: FakeRedis): string {
  const L = lauxlib.luaL_newstate()
  lualib.luaL_openlibs(L)
  lua.lua_newtable(L)
  lua.lua_pushjsfunction(L, (S: unknown) => {
    const n = lua.lua_gettop(S)
    const args: string[] = []
    for (let i = 1; i <= n; i++) args.push(to_jsstring(lua.lua_tolstring(S, i)))
    const r = db.call(args[0], ...args.slice(1))
    if (r === false) lua.lua_pushboolean(S, 0)
    else if (typeof r === 'number') lua.lua_pushinteger(S, r)
    else lua.lua_pushstring(S, to_luastring(r))
    return 1
  })
  lua.lua_setfield(L, -2, to_luastring('call'))
  lua.lua_setglobal(L, to_luastring('redis'))
  const table = (name: string, items: (string | number)[]) => {
    lua.lua_newtable(L)
    items.forEach((v, i) => {
      lua.lua_pushstring(L, to_luastring(String(v))) // в настоящем Redis KEYS и ARGV — всегда строки
      lua.lua_rawseti(L, -2, i + 1)
    })
    lua.lua_setglobal(L, to_luastring(name))
  }
  table('KEYS', keys)
  table('ARGV', argv)
  if (lauxlib.luaL_loadstring(L, to_luastring(script)) !== 0 || lua.lua_pcall(L, 0, 1, 0) !== 0) throw new Error('Lua: ' + to_jsstring(lua.lua_tolstring(L, -1)))
  return to_jsstring(lua.lua_tolstring(L, -1))
}

const K = (s: string) => ['day:shared', 'total', `sess:${s}`, `ip:${s}`, 'active']
const reserve = (db: FakeRedis, k: string[], limits: { day?: number; total?: number; sess?: number; ip?: number; conc?: number }) =>
  runLua(RESERVE, k, [limits.day ?? 100, limits.total ?? 0, limits.sess ?? 4, limits.ip ?? 8, limits.conc ?? 3, 172800, 172800, 3600, 120], db)

const db = new FakeRedis()
ok('первая резервация проходит', reserve(db, K('a'), {}) === 'ok')
ok('счётчики выросли и получили срок жизни', db.data.get('day:shared') === '1' && db.data.get('total') === '1' && db.ttl.get('day:shared') === 172800 && db.ttl.get('ip:a') === 3600)

const d2 = new FakeRedis()
reserve(d2, K('s'), { sess: 2 }); runLua(RELEASE, K('s'), ['0'], d2)
reserve(d2, K('s'), { sess: 2 }); runLua(RELEASE, K('s'), ['0'], d2)
ok('лимит на урок (2) срабатывает', reserve(d2, K('s'), { sess: 2 }) === 'session_limit')

const d3 = new FakeRedis()
for (let i = 0; i < 3; i++) { reserve(d3, K('x' + i), { day: 3 }); runLua(RELEASE, K('x' + i), ['0'], d3) }
ok('дневной лимит (3) срабатывает', reserve(d3, K('x9'), { day: 3 }) === 'daily_limit')

const d4 = new FakeRedis()
for (let i = 0; i < 2; i++) { reserve(d4, K('t' + i), { total: 2 }); runLua(RELEASE, K('t' + i), ['0'], d4) }
ok('общий потолок (2) срабатывает', reserve(d4, K('t9'), { total: 2 }) === 'daily_limit')

const d5 = new FakeRedis()
for (let i = 0; i < 3; i++) { reserve(d5, ['d', 't', 's' + i, 'ip:same', 'act'], { ip: 3 }); runLua(RELEASE, ['d', 't', 's' + i, 'ip:same', 'act'], ['0'], d5) }
ok('лимит с одного адреса (3) срабатывает', reserve(d5, ['d', 't', 'sNEW', 'ip:same', 'act'], { ip: 3 }) === 'ip_limit')

const d6 = new FakeRedis()
reserve(d6, K('c1'), { conc: 2 }); reserve(d6, K('c2'), { conc: 2 })
ok('одновременных запросов не больше 2 («параллельные функции»)', reserve(d6, K('c3'), { conc: 2 }) === 'busy')
runLua(RELEASE, K('c1'), ['0'], d6)
ok('после завершения слот освобождается', reserve(d6, K('c3'), { conc: 2 }) === 'ok')

const d7 = new FakeRedis()
reserve(d7, K('r'), {})
runLua(RELEASE, K('r'), ['1'], d7)
ok('возврат при ошибке fal.ai уменьшает все счётчики', d7.data.get('day:shared') === '0' && d7.data.get('total') === '0' && d7.data.get('sess:r') === '0' && d7.data.get('ip:r') === '0' && d7.data.get('active') === '0')
runLua(RELEASE, K('r'), ['1'], d7)
ok('счётчики не уходят в минус', Number(d7.data.get('day:shared')) === 0)

const d8 = new FakeRedis()
reserve(d8, K('f'), { day: 1 })
ok('отказ не увеличивает счётчики', reserve(d8, K('g'), { day: 1 }) === 'daily_limit' && d8.data.get('sess:g') === undefined && d8.data.get('total') === '1' && d8.data.get('day:shared') === '1')

// ---- UpstashStore без сети: формат запросов и защита личных данных ----
const sent: unknown[][] = []
const fakeFetch = (async (_u: unknown, init: { body: string; headers: Record<string, string> }) => {
  sent.push([JSON.parse(init.body), init.headers.Authorization])
  const body = JSON.parse(init.body) as string[]
  return new Response(JSON.stringify({ result: body[0] === 'EVAL' ? 'ok' : body[0] === 'SET' ? 'OK' : null }), { status: 200 })
}) as unknown as typeof fetch
const st = new UpstashStore('https://redis.example', 'TOKEN-SECRET', 'salt', fakeFetch)
async function main() {
  ok('резервация через REST возвращает ok', (await st.reserve('203.0.113.7', 'session-123456', { dailyLimit: 30, totalLimit: 30, hourlyPerIp: 8, sessionLimit: 4, maxConcurrent: 3 })).ok === true)
  const cmd = sent[0][0] as string[]
  ok('используется EVAL с 5 ключами', cmd[0] === 'EVAL' && cmd[2] === '5')
  ok('адрес и номер урока в Redis только в виде хэша', !JSON.stringify(cmd).includes('203.0.113.7') && !JSON.stringify(cmd).includes('session-123456'))
  ok('токен идёт в заголовке, не в теле', sent[0][1] === 'Bearer TOKEN-SECRET' && !JSON.stringify(cmd).includes('TOKEN-SECRET'))
  ok('идентификатор запроса: первый раз true', (await st.once('abc')) === true)
  const bad = new UpstashStore('https://redis.example', 'T', 's', (async () => new Response('x', { status: 500 })) as unknown as typeof fetch)
  let threw = false
  try { await bad.reserve('1.1.1.1', 'sid-123456', { dailyLimit: 1, hourlyPerIp: 1, sessionLimit: 1, maxConcurrent: 1 }) } catch { threw = true }
  ok('ошибка хранилища пробрасывается (сервер откажет, а не потратит деньги)', threw)
  console.log(failed ? `\nПровалено проверок: ${failed}` : '\nВсе проверки хранилища пройдены')
  process.exit(failed ? 1 : 0)
}
void main()
