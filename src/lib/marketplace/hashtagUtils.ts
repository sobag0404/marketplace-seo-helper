/**
 * Утилиты для определения языка и допустимости хештегов.
 * Используются генератором, валидаторами и аналитикой.
 */

/**
 * Белый список английских слов, допустимых в хештегах.
 * Бренды, популярные международные термины, устоявшиеся выражения.
 */
export const ALLOWED_ENGLISH_WORDS: Set<string> = new Set([
  // Популярные международные слова
  'love', 'baby', 'kawaii', 'cool', 'sexy', 'cute', 'style', 'fashion',
  'mood', 'vibe', 'swag', 'yolo', 'wow', 'hot', 'top', 'best', 'pro',
  'premium', 'elite', 'gold', 'royal', 'super', 'mega', 'ultra', 'mini',
  'maxi', 'turbo', 'retro', 'vintage', 'classic', 'modern', 'new', 'pop',
  'art', 'design', 'studio', 'creative', 'original', 'limited', 'exclusive',
  'luxury', 'glam', 'chic', 'fit', 'gym', 'fun', 'party',
  'pink', 'black', 'white', 'green', 'red', 'blue', 'silver',
  // Бренды автомобилей
  'ford', 'bmw', 'mercedes', 'audi', 'toyota', 'honda', 'hyundai',
  'kia', 'nissan', 'mazda', 'subaru', 'porsche', 'ferrari', 'lamborghini',
  'volkswagen', 'volvo', 'lexus', 'infiniti', 'jeep', 'dodge', 'chevrolet',
  'tesla', 'mitsubishi', 'suzuki', 'landrover', 'rangerover',
  // Бренды электроники
  'apple', 'samsung', 'sony', 'lg', 'xiaomi', 'huawei', 'oneplus',
  'google', 'microsoft', 'intel', 'amd', 'nvidia', 'razer', 'logitech',
  'bose', 'jbl', 'beats', 'marshall', 'sennheiser',
  // Бренды моды
  'nike', 'adidas', 'puma', 'reebok', 'newbalance', 'converse', 'vans',
  'gucci', 'prada', 'versace', 'dior', 'chanel', 'louisvuitton',
  'zara', 'uniqlo',
  // Игровые
  'playstation', 'xbox', 'nintendo', 'minecraft', 'fortnite', 'roblox',
  'twitch', 'steam', 'valorant', 'csgo', 'dota', 'apex',
  // Аниме
  'naruto', 'onepiece', 'dragonball', 'pokemon', 'evangelion',
  'demonslayer', 'jujutsu', 'spyfamily', 'sailormoon', 'gundam', 'berserk',
  'onepunch',
  // Спорт
  'fifa', 'nba', 'nhl', 'ufc', 'wwe', 'mlb', 'nfl',
  // Другие популярные
  'insta', 'instagram', 'tiktok', 'youtube', 'spotify', 'netflix',
  'lego', 'barbie', 'disney', 'marvel', 'dc', 'starwars', 'harrypotter',
  'hellokitty', 'transformers',
]);

/**
 * Определить, является ли хештег русскоязычным.
 * Хештег считается русским, если содержит хотя бы одну кириллическую букву.
 */
export function isRussianHashtag(tag: string): boolean {
  const content = tag.replace(/^#/, '');
  return /[а-яА-ЯёЁ]/.test(content);
}

/**
 * Определить, является ли хештег допустимым английским словом.
 * Разрешены бренды и популярные международные термины.
 */
export function isAllowedEnglishHashtag(tag: string): boolean {
  const content = tag.replace(/^#/, '').toLowerCase().replace(/_/g, '');
  for (const word of ALLOWED_ENGLISH_WORDS) {
    const normalizedWord = word.replace(/_/g, '');
    if (content === normalizedWord || content.includes(normalizedWord)) {
      return true;
    }
  }
  return false;
}
