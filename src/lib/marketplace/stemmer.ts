/**
 * Лёгкий стеммер для русской морфологии.
 * Снимает окончания падежей/чисел, чтобы #плед и #пледы считались дубликатами.
 *
 * Не претендует на академическую точность — оптимизирован под хештеги
 * (короткие слова, нижний регистр, без #).
 */

/** Плохие «основы» после агрессивного снятия — оставляем как есть */
const STOP_STEMS = new Set<string>([
  'для', 'или', 'при', 'над', 'под', 'без', 'про', 'через', 'между',
  'перед', 'после', 'около', 'возле', 'рядом', 'вокруг', 'среди',
]);

/**
 * Снять типичные русские окончания.
 * Возвращает «основу» слова (не всегда лингвистически верную, но стабильную
 * для группы форм одного слова).
 */
export function stemRussian(word: string): string {
  let w = word.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '');

  // Слишком короткие — не трогаем
  if (w.length <= 4) return w;

  // Порядок важен: сначала более длинные/специфичные окончания
  // Существительные: падежные окончания
  const endings = [
    'ами', 'ями', 'иями', // творительный мн.
    'ах', 'ях', // предложный мн.
    'ов', 'ев', 'ёв', 'ей', 'ий', // родительный мн.
    'ом', 'ем', 'ём', 'ам', 'ям', 'ям', // дательный ед.
    'ах', 'ях',
    'у', 'ю', // дательный ед.
    'а', 'я', 'о', 'е', 'ы', 'и', // родительный/винительный ед.
    'ть', 'тся', 'ться', // инфинитив/глагол
    'ет', 'ит', 'ат', 'ят', 'ут', 'ют', // глагольные окончания
    'ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ее', // прилагательные
    'ые', 'ие',
    'ого', 'его', 'ому', 'ему', 'ыми', 'ими', // прилагательные падежи
    'ость', 'ение', 'ание', // существительные-отглагольные
  ];

  for (const ending of endings) {
    if (w.length > ending.length + 2 && w.endsWith(ending)) {
      const candidate = w.slice(0, w.length - ending.length);
      // Не оставляем слишком короткую основу
      if (candidate.length >= 3 && !STOP_STEMS.has(candidate)) {
        w = candidate;
        break;
      }
    }
  }

  // Снять мягкий/твёрдый знак на конце
  w = w.replace(/[ьъ]$/, '');

  return w;
}

/**
 * Проверить, являются ли два хештега морфологическими вариантами
 * одного слова (#плед / #пледы / #пледом → true).
 */
export function areMorphologicalVariants(tag1: string, tag2: string): boolean {
  const a = tag1.replace(/^#/, '').toLowerCase();
  const b = tag2.replace(/^#/, '').toLowerCase();
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 5) return false;
  return stemRussian(a) === stemRussian(b);
}

/**
 * Дедуплицировать массив хештегов с учётом морфологии.
 * Если два тега — морфологические варианты, оставляем первый (более приоритетный).
 *
 * Также выполняет обычную case-insensitive дедупликацию.
 */
export function dedupHashtagsMorphological(tags: string[]): string[] {
  const result: string[] = [];
  const stems = new Set<string>();
  const seen = new Set<string>();

  for (const tag of tags) {
    const content = tag.replace(/^#/, '').toLowerCase();
    if (seen.has(content)) continue;
    seen.add(content);

    const stem = stemRussian(content);
    if (stems.has(stem)) continue;
    stems.add(stem);

    result.push(tag);
  }

  return result;
}
