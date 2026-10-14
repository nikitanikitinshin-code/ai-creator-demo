import { newConv, respond, buildPrompt, chipsFor } from '../src/lib/dialog'
import type { Conv } from '../src/types'

function run(title: string, lines: string[]) {
  console.log(`\n=== ${title} ===`)
  let c: Conv = newConv()
  lines.forEach((l, i) => {
    console.log(`\n👧 ${l}`)
    const t = respond(c, l, i)
    c = t.conv
    t.say.forEach((s) => console.log(`🤖 ${s}`))
    console.log(`   [phase=${c.phase} pending=${c.pending} asked=${c.asked.join(',')} gen=${!!t.generate} upsell=${!!t.upsell} note=${!!t.promptNote}]`)
    console.log(`   chips: ${chipsFor(c).map((x) => x.label).join(' | ')}`)
  })
  console.log('\nPROMPT:', buildPrompt(c.spec))
  console.log('SPEC:', JSON.stringify(c.spec))
}

run('A: дракон по шагам', ['Хочу создать дракона', 'Чёрный с золотыми доспехами', 'Красные глаза и большие рога', 'Стилизованный, как в мультфильме'])
run('B: подробное описание', ['Огромный чёрный дракон с золотыми доспехами, красными глазами и металлическими крыльями в стиле реалистичного кино'])
run('V: бессмыслица', ['Хочу дракона', 'кх', 'Чёрный', 'asdfgh', 'ыыыыы'])
run('G: смена цвета', ['Хочу дракона', 'Чёрный с золотыми доспехами', 'Нет, пусть он будет синим', 'Красные глаза и большие рога', 'Реалистичный, как в кино'])
run('D: улучшение и нравится', ['Дракон из будущего', 'Серебристый, с неоновой подсветкой', 'Светящиеся голубые глаза', 'в стиле кино', 'Хочу изменить', 'пусть рога будут маленькие и красные глаза', 'Мне нравится'])
run('E: прочее', ['Хочу создать пиццу-воина', 'не знаю', 'Золотые доспехи', 'нет', 'Реалистичный', 'мне нравится'])
run('X: цвет после существительного', ['Дракон', 'Чёрный', 'Красные глаза', 'Реалистичный', 'пусть крылья будут красные и глаза голубые'])
