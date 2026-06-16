import type { Preset, HashtagRule, GenerationSettings } from './types';
import { normalizeText, getWords } from './normalizeText';
import { filterValidHashtags } from './validators';
import { allPresets } from './presets';

/** Настройки генерации по умолчанию */
export const DEFAULT_SETTINGS: GenerationSettings = {
  targetHashtagCount: 10,
  maxHashtagCount: 30,
  russianFirst: true,
  useRelatedCategories: true,
};

/**
 * Белый список английских слов, допустимых в хештегах.
 * Бренды, популярные международные термины, устоявшиеся выражения.
 */
const ALLOWED_ENGLISH_WORDS: Set<string> = new Set([
  // Популярные международные слова
  'love', 'baby', 'kawaii', 'cool', 'sexy', 'cute', 'style', 'fashion',
  'mood', 'vibe', 'swag', 'yolo', 'wow', 'hot', 'top', 'best', 'pro',
  'premium', 'elite', 'gold', 'royal', 'super', 'mega', 'ultra', 'mini',
  'maxi', 'turbo', 'retro', 'vintage', 'classic', 'modern', 'new', 'pop',
  'art', 'design', 'studio', 'creative', 'original', 'limited', 'exclusive',
  'luxury', 'glam', 'chic', 'fit', 'gym', 'fun', 'party',
  'pink', 'black', 'white', 'green', 'red', 'blue', 'gold', 'silver',
  // Бренды автомобилей
  'ford', 'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'hyundai',
  'kia', 'nissan', 'mazda', 'subaru', 'porsche', 'ferrari', 'lamborghini',
  'volkswagen', 'volvo', 'lexus', 'infiniti', 'jeep', 'dodge', 'chevrolet',
  'tesla', 'mini', 'mitsubishi', 'suzuki', 'land_rover', 'range_rover',
  // Бренды электроники
  'apple', 'samsung', 'sony', 'lg', 'xiaomi', 'huawei', 'oneplus',
  'google', 'microsoft', 'intel', 'amd', 'nvidia', 'razer', 'logitech',
  'bose', 'jbl', 'beats', 'marshall', 'sennheiser',
  // Бренды моды
  'nike', 'adidas', 'puma', 'reebok', 'new_balance', 'converse', 'vans',
  'gucci', 'prada', 'versace', 'dior', 'chanel', 'louis_vuitton',
  'zara', 'h&m', 'uniqlo', 'pull_bear', 'bershka',
  // Игровые
  'playstation', 'xbox', 'nintendo', 'minecraft', 'fortnite', 'roblox',
  'twitch', 'steam', 'valorant', 'csgo', 'dota', 'lol', 'apex',
  // Аниме
  'naruto', 'onepiece', 'dragonball', 'pokemon', 'evangelion',
  'attack_on_titan', 'demon_slayer', 'jujutsu', 'spy_x_family',
  'sailor_moon', 'gundam', 'berserk', 'one_punch',
  // Спорт
  'fifa', 'nba', 'nhl', 'ufc', 'wwe', 'mlb', 'nfl',
  // Другие популярные
  'insta', 'instagram', 'tiktok', 'youtube', 'spotify', 'netflix',
  'lego', 'barbie', 'disney', 'marvel', 'dc', 'star_wars', 'harry_potter',
  'hello_kitty', 'pokemon', 'transformers',
]);

/**
 * Определить, является ли хештег русскоязычным.
 * Хештег считается русским, если содержит хотя бы одну кириллическую букву.
 */
function isRussianHashtag(tag: string): boolean {
  const content = tag.replace(/^#/, '');
  return /[а-яА-ЯёЁ]/.test(content);
}

/**
 * Определить, является ли хештег допустимым английским словом.
 * Разрешены бренды и популярные международные термины.
 */
function isAllowedEnglishHashtag(tag: string): boolean {
  const content = tag.replace(/^#/, '').toLowerCase().replace(/_/g, '');
  // Проверяем, содержит ли хештег хотя бы одно слово из белого списка
  for (const word of ALLOWED_ENGLISH_WORDS) {
    const normalizedWord = word.replace(/_/g, '');
    if (content === normalizedWord || content.includes(normalizedWord)) {
      return true;
    }
  }
  return false;
}

/**
 * Найти все подходящие группы правил для названия товара.
 * Поддержка русской морфологии: слово считается совпавшим с ключевым словом,
 * если оно начинается с этого ключевого слова (минимум 3 символа).
 */
function findMatchingRules(productName: string, rules: HashtagRule[]): HashtagRule[] {
  const normalized = normalizeText(productName);
  const words = getWords(productName);

  return rules.filter((rule) => {
    return rule.keywords.some((keyword) => {
      const normalizedKeyword = keyword.toLowerCase().replace(/ё/g, 'е');

      // Многословные ключевые фразы — ищем как подстроку в нормализованном тексте
      if (normalizedKeyword.includes(' ')) {
        return normalized.includes(normalizedKeyword);
      }

      // Однословные ключевые слова — проверяем совпадение с учётом морфологии
      return words.some((w) => {
        // Точное совпадение
        if (w === normalizedKeyword) return true;

        // Совпадение по началу слова (русская морфология: «прикол» → «приколом»)
        if (normalizedKeyword.length >= 3 && w.startsWith(normalizedKeyword)) return true;

        // Обратная проверка: слово из текста короче ключевого слова,
        // но ключевое слово начинается с него (редкий случай)
        if (w.length >= 3 && normalizedKeyword.startsWith(w)) return true;

        return false;
      });
    });
  });
}

/** Отсортировать группы по приоритету (по убыванию) */
function sortByPriority(rules: HashtagRule[]): HashtagRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority);
}

/**
 * Вычислить «вес» хештега для сортировки по популярности.
 * Учитывает: приоритет группы, популярность группы, язык (русский приоритет).
 */
function computeHashtagScore(
  tag: string,
  rulePriority: number,
  rulePopularity: number,
  russianFirst: boolean
): number {
  let score = rulePriority * 2 + rulePopularity;

  // Бонус за русский язык
  if (russianFirst && isRussianHashtag(tag)) {
    score += 50;
  }

  // Штраф за неразрешённые английские хештеги
  if (!isRussianHashtag(tag) && !isAllowedEnglishHashtag(tag)) {
    score -= 100;
  }

  return score;
}

/** Public wrapper for findMatchingRules — used by analytics */
export function findMatchingRulesForAnalytics(productName: string, rules: HashtagRule[]): HashtagRule[] {
  return findMatchingRules(productName, rules);
}

/**
 * Получить хештеги из смежных категорий.
 * Берём правила из связанных пресетов, которые семантически подходят.
 */
function getRelatedCategoryHashtags(
  productName: string,
  preset: Preset,
  settings: GenerationSettings
): Array<{ tag: string; score: number }> {
  if (!settings.useRelatedCategories || !preset.relatedCategories?.length) {
    return [];
  }

  const results: Array<{ tag: string; score: number }> = [];

  for (const relatedId of preset.relatedCategories) {
    const relatedPreset = allPresets.find((p) => p.id === relatedId);
    if (!relatedPreset) continue;

    // Найти совпадающие группы в смежной категории
    const matchingRules = findMatchingRules(productName, relatedPreset.rules);
    for (const rule of matchingRules) {
      const popularity = rule.popularity ?? 50;
      for (const tag of rule.hashtags) {
        const score = computeHashtagScore(tag, rule.priority, popularity, settings.russianFirst);
        // Понижаем вес смежных категорий (они менее релевантны)
        results.push({ tag, score: score * 0.7 });
      }
    }
  }

  return results;
}

/**
 * Основная функция генерации хештегов с поддержкой:
 * - Целевого количества хештегов (targetCount)
 * - Приоритета русского языка
 * - Популярности (сортировка)
 * - Смежных категорий
 */
export function generateHashtags(
  productName: string,
  preset: Preset,
  productNameForExclusion?: string,
  settings: GenerationSettings = DEFAULT_SETTINGS
): string {
  if (!productName || productName.trim().length === 0) {
    return '';
  }

  const target = settings.targetHashtagCount;
  const max = settings.maxHashtagCount;

  // 1. Найти совпадающие группы в текущем пресете
  const matchingRules = findMatchingRules(productName, preset.rules);

  // 2. Отсортировать по приоритету
  const sortedRules = sortByPriority(matchingRules);

  // 3. Собрать хештеги с весами
  const hashtagScores: Map<string, number> = new Map();

  // Тематические хештеги из текущего пресета
  for (const rule of sortedRules) {
    const popularity = rule.popularity ?? 50;
    for (const tag of rule.hashtags) {
      const score = computeHashtagScore(tag, rule.priority, popularity, settings.russianFirst);
      const existing = hashtagScores.get(tag) ?? 0;
      hashtagScores.set(tag, Math.max(existing, score));
    }
  }

  // Базовые хештеги
  for (const tag of preset.baseHashtags) {
    const score = computeHashtagScore(tag, 40, 60, settings.russianFirst);
    const existing = hashtagScores.get(tag) ?? 0;
    hashtagScores.set(tag, Math.max(existing, score));
  }

  // Универсальные хештеги (если нет тематических)
  if (matchingRules.length === 0) {
    for (const tag of preset.universalHashtags) {
      const score = computeHashtagScore(tag, 30, 70, settings.russianFirst);
      const existing = hashtagScores.get(tag) ?? 0;
      hashtagScores.set(tag, Math.max(existing, score));
    }
  }

  // 4. Хештеги из смежных категорий (только если не набрали target)
  if (hashtagScores.size < target) {
    const relatedHashtags = getRelatedCategoryHashtags(productName, preset, settings);
    for (const { tag, score } of relatedHashtags) {
      const existing = hashtagScores.get(tag) ?? 0;
      hashtagScores.set(tag, Math.max(existing, score));
    }
  }

  // 5. Если после смежных категорий всё ещё мало — добавить универсальные с пониженным весом
  if (hashtagScores.size < target) {
    for (const tag of preset.universalHashtags) {
      if (!hashtagScores.has(tag)) {
        const score = computeHashtagScore(tag, 20, 50, settings.russianFirst) * 0.6;
        hashtagScores.set(tag, score);
      }
    }
  }

  // 6. Если всё ещё мало — добавить популярные хештеги из базовых смежных категорий
  if (hashtagScores.size < target && preset.relatedCategories?.length) {
    for (const relatedId of preset.relatedCategories) {
      const relatedPreset = allPresets.find((p) => p.id === relatedId);
      if (!relatedPreset) continue;

      // Добавить базовые хештеги смежных категорий с низким весом
      for (const tag of relatedPreset.baseHashtags) {
        if (!hashtagScores.has(tag)) {
          const score = computeHashtagScore(tag, 15, 40, settings.russianFirst) * 0.4;
          hashtagScores.set(tag, score);
        }
      }

      // Добавить универсальные хештеги смежных категорий
      for (const tag of relatedPreset.universalHashtags) {
        if (!hashtagScores.has(tag)) {
          const score = computeHashtagScore(tag, 10, 35, settings.russianFirst) * 0.4;
          hashtagScores.set(tag, score);
        }
      }
    }
  }

  // 6.5 Финальный фоллбэк — универсальные русские хештеги для маркетплейсов
  const GENERIC_FALLBACK_HASHTAGS = [
    '#подарок', '#выбор', '#топ', '#лучшее', '#рекомендация',
    '#качество', '#стиль', '#тренд', '#новинка', '#популярное',
    '#оригинал', '#эксклюзив', '#хит', '#мастхэв', '#практичность',
    '#красота', '#уют', '#дизайн', '#комфорт', '#радость',
  ];
  if (hashtagScores.size < target) {
    for (const tag of GENERIC_FALLBACK_HASHTAGS) {
      if (!hashtagScores.has(tag)) {
        const score = computeHashtagScore(tag, 5, 30, settings.russianFirst) * 0.3;
        hashtagScores.set(tag, score);
        if (hashtagScores.size >= target) break;
      }
    }
  }

  // 7. Сортировка по весу (популярности) — сначала самые популярные
  const sortedHashtags = [...hashtagScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  // 8. Удалить запрещённые слова
  const forbiddenWords = [...preset.forbiddenWords];
  if (productNameForExclusion) {
    const nameWords = getWords(productNameForExclusion);
    nameWords.forEach((w) => {
      if (w.length > 2) forbiddenWords.push(w);
    });
  }

  let filtered = filterValidHashtags(sortedHashtags, forbiddenWords);

  // 8.5 Если после фильтрации меньше target — дополнить из расширенного фоллбэка
  const EXTENDED_FALLBACK_HASHTAGS = [
    '#выбор', '#топ', '#лучшее', '#рекомендация',
    '#качество', '#стиль', '#тренд', '#новинка', '#популярное',
    '#оригинал', '#эксклюзив', '#хит', '#мастхэв', '#практичность',
    '#красота', '#дизайн', '#комфорт', '#радость',
    '#идея', '#находка', '#супер', '#фирменный', '#интересный',
    '#премиум', '#модный', '#актуальный', '#яркий', '#нестандартный',
    '#восторг', '#удача', '#чудо', '#вдохновение', '#успех',
  ];
  if (filtered.length < target) {
    const filteredSet = new Set(filtered.map(t => t.replace(/^#/, '').toLowerCase()));
    for (const tag of EXTENDED_FALLBACK_HASHTAGS) {
      const content = tag.replace(/^#/, '').toLowerCase();
      // Skip if already present or if it contains a forbidden word
      if (filteredSet.has(content)) continue;
      let forbidden = false;
      for (const word of forbiddenWords) {
        if (content.includes(word.toLowerCase())) {
          forbidden = true;
          break;
        }
      }
      if (forbidden) continue;
      filtered.push(tag);
      filteredSet.add(content);
      if (filtered.length >= target) break;
    }
  }

  // 9. Если русский приоритет — переместить русские хештеги наверх
  let result = filtered;
  if (settings.russianFirst) {
    const russian = filtered.filter(isRussianHashtag);
    const allowedEnglish = filtered.filter(
      (t) => !isRussianHashtag(t) && isAllowedEnglishHashtag(t)
    );
    const otherEnglish = filtered.filter(
      (t) => !isRussianHashtag(t) && !isAllowedEnglishHashtag(t)
    );
    result = [...russian, ...allowedEnglish, ...otherEnglish];
  }

  // 10. Ограничить до целевого количества (target) или максимума
  const limit = Math.min(target, max);
  return result.slice(0, limit).join(' ');
}

/** Генерация хештегов для массива строк */
export function generateHashtagsForRows(
  rows: { name: string }[],
  preset: Preset,
  settings: GenerationSettings = DEFAULT_SETTINGS
): string[] {
  return rows.map((row) => generateHashtags(row.name, preset, row.name, settings));
}

/**
 * Получить популярность хештега (для аналитики).
 * Чем выше значение, тем популярнее хештег.
 */
export function getHashtagPopularity(tag: string, preset: Preset): number {
  // Найти правило, содержащее этот хештег
  for (const rule of preset.rules) {
    if (rule.hashtags.includes(tag)) {
      return (rule.popularity ?? 50) + rule.priority;
    }
  }

  // Базовые хештеги
  if (preset.baseHashtags.includes(tag)) {
    return 60;
  }

  // Универсальные
  if (preset.universalHashtags.includes(tag)) {
    return 50;
  }

  return 30; // По умолчанию — низкая популярность
}
