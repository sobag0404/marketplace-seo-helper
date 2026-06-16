/** Нормализация текста для поиска ключевых слов */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();
}

/** Получить массив слов из нормализованного текста */
export function getWords(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(/\s+/).filter((w) => w.length > 0);
}
