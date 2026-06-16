import type { ValidationResult } from './types';
import { sizePatterns } from './presets/common';

/** Запрещённые символы в хештеге (кроме #, букв, цифр и _) */
const FORBIDDEN_CHARS_REGEX = /[^a-zA-Zа-яА-ЯёЁ0-9_#]/;

/** Максимальная длина хештега */
const MAX_HASHTAG_LENGTH = 30;

/** Максимальное количество хештегов в ячейке */
export const MAX_HASHTAGS_PER_CELL = 30;

/** Глобальный список запрещённых слов (нижний регистр, без #) */
const GLOBAL_FORBIDDEN: Set<string> = new Set([
  'плед', 'флисовый', 'флис', 'одеяло', 'покрывало',
  'ozon', 'wildberries', 'wb', 'вайлдберриз', 'озон',
  'купить', 'цена', 'доставка', 'скидка', 'акция',
  'распродажа', 'дешево', 'бесплатно', 'размер',
]);

/** Проверяет, содержит ли хештег запрещённое слово */
function containsForbiddenWord(tag: string): boolean {
  const content = tag.replace(/^#/, '').toLowerCase();
  for (const word of GLOBAL_FORBIDDEN) {
    if (content.includes(word)) return true;
  }
  return false;
}

/** Проверяет, содержит ли хештег размер или артикул */
function containsSizeOrArticle(tag: string): boolean {
  const content = tag.replace(/^#/, '');
  return sizePatterns.some((p) => p.test(content));
}

/** Валидация хештега */
export function validateHashtag(tag: string): ValidationResult {
  const errors: string[] = [];

  if (!tag.startsWith('#')) errors.push('Хештег должен начинаться с #');
  if (tag.includes(' ')) errors.push('Хештег не должен содержать пробелы');
  if (FORBIDDEN_CHARS_REGEX.test(tag.replace(/^#/, ''))) {
    errors.push('Хештег содержит запрещённые символы');
  }
  if (tag.length > MAX_HASHTAG_LENGTH) {
    errors.push(`Хештег длиннее ${MAX_HASHTAG_LENGTH} символов`);
  }
  if (containsForbiddenWord(tag)) {
    errors.push('Хештег содержит запрещённое слово');
  }
  if (containsSizeOrArticle(tag)) {
    errors.push('Хештег содержит размер или артикул');
  }

  return { valid: errors.length === 0, errors };
}

/** Очистка и форматирование хештега */
export function sanitizeHashtag(tag: string): string {
  let result = tag
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9_#]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!result.startsWith('#')) {
    result = '#' + result;
  }

  // Обрезать до MAX_HASHTAG_LENGTH символов, не ломая _
  if (result.length > MAX_HASHTAG_LENGTH) {
    result = result.substring(0, MAX_HASHTAG_LENGTH);
    result = result.replace(/_+$/, '');
  }

  return result;
}

/** Фильтрация массива хештегов: валидные и уникальные */
export function filterValidHashtags(tags: string[], forbiddenWords?: string[]): string[] {
  const localForbidden = new Set(GLOBAL_FORBIDDEN);
  if (forbiddenWords) {
    forbiddenWords.forEach((w) => localForbidden.add(w.toLowerCase()));
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const tag = sanitizeHashtag(raw);
    const content = tag.replace(/^#/, '').toLowerCase();

    // Пропуск пустых
    if (content.length === 0) continue;

    // Пропуск дубликатов
    if (seen.has(content)) continue;
    seen.add(content);

    // Пропуск запрещённых
    let forbidden = false;
    for (const word of localForbidden) {
      if (content.includes(word)) {
        forbidden = true;
        break;
      }
    }
    if (forbidden) continue;

    // Пропуск размеров/артикулов
    if (containsSizeOrArticle(tag)) continue;

    // Пропуск слишком длинных
    if (tag.length > MAX_HASHTAG_LENGTH) continue;

    result.push(tag);
  }

  return result.slice(0, MAX_HASHTAGS_PER_CELL);
}
