import { newConv, respond, buildPrompt, chipsFor } from '../src/lib/dialog'
import { looksPersonal } from '../src/lib/nlu'
import type { Conv } from '../src/types'
function run(title: string, lines: string[]) {
  console.log(`\n=== ${title} ===`)
  let c: Conv = newConv()
  lines.forEach((l, i) => {
    console.log(`\n👧 ${l}`)
    const t = respond(c, l, i); c = t.conv
    t.say.forEach((s) => console.log(`🤖 ${s}`))
    console.log(`   [phase=${c.phase} pending=${c.pending} gen=${!!t.generate} upsell=${!!t.upsell}] chips: ${chipsFor(c).map((x) => x.label).join(' | ')}`)
  })
  console.log('SPEC:', JSON.stringify(c.spec))
}
run('Человек-паук', ['Хочу Человека-паука', 'красно-синий костюм', 'маска и белые глаза', 'как в кино'])
run('Принцесса в платье', ['создай мне девочку-принцессу в розовом платье'])
run('dragon', ['dragon', 'black with gold'])
run('аниме', ['Хочу робота', 'синий', 'голубые глаза', 'в стиле аниме'])
run('имя и правки', ['Огромный чёрный дракон с золотыми доспехами, красными глазами и большими рогами в стиле кино', 'Мне нравится', 'Лунар', ])
run('имя пропуск', ['Огромный чёрный дракон с золотыми доспехами, красными глазами в стиле кино', 'Мне нравится', 'Без имени'])
run('хочу изменить', ['Огромный чёрный дракон с золотыми доспехами, красными глазами в стиле кино', 'Хочу изменить', 'пусть глаза будут голубые'])
console.log('\nPII:', ['Меня зовут Маша', 'мне 9 лет', 'я живу в Казани', '89161234567', 'a@b.ru', 'Огромный дракон с красными глазами', 'его зовут Рэйн', 'дракон 3 головы'].map((t) => `${t}=>${looksPersonal(t)}`).join(' | '))
