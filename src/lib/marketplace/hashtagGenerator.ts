import type { GenerationSettings } from './types';
import { isRussianHashtag, isAllowedEnglishHashtag } from './hashtagUtils';

export { isRussianHashtag, isAllowedEnglishHashtag } from './hashtagUtils';

/** Настройки генерации по умолчанию */
export const DEFAULT_SETTINGS: GenerationSettings = {
  targetHashtagCount: 10,
  maxHashtagCount: 30,
  russianFirst: true,
  useRelatedCategories: true,
};

/**
 * Ранжировать список хештегов по качеству:
 * 1. Русские хештеги — выше (если russianFirst)
 * 2. Разрешённые английские (бренды/термины) — следующими
 * 3. Прочие английские — в конце
 * Внутри каждой группы сохраняется исходный порядок (стабильная сортировка).
 */
export function rankHashtags(
  tags: string[],
  settings: GenerationSettings = DEFAULT_SETTINGS
): string[] {
  if (!settings.russianFirst) return [...tags];

  const russian: string[] = [];
  const allowedEnglish: string[] = [];
  const other: string[] = [];

  for (const tag of tags) {
    if (isRussianHashtag(tag)) {
      russian.push(tag);
    } else if (isAllowedEnglishHashtag(tag)) {
      allowedEnglish.push(tag);
    } else {
      other.push(tag);
    }
  }

  return [...russian, ...allowedEnglish, ...other];
}

/** Карточка длины хештега для аналитики */
export type LengthBucket = 'short' | 'medium' | 'long' | 'xlong';

export const LENGTH_BUCKET_LABELS: Record<LengthBucket, string> = {
  short: 'Короткие (≤6)',
  medium: 'Средние (7–12)',
  long: 'Длинные (13–20)',
  xlong: 'Очень длинные (>20)',
};

function getLengthBucket(tag: string): LengthBucket {
  const len = tag.replace(/^#/, '').length;
  if (len <= 6) return 'short';
  if (len <= 12) return 'medium';
  if (len <= 20) return 'long';
  return 'xlong';
}

export interface HashtagAnalysis {
  total: number;
  unique: number;
  russian: number;
  english: number;
  numeric: number;
  byLength: Record<LengthBucket, number>;
  avgLength: number;
}

/**
 * Анализ массива хештегов (без учёта дубликатов внутри строки).
 * Используется панелью аналитики для отображения распределения.
 */
export function analyzeHashtags(tags: string[]): HashtagAnalysis {
  let russian = 0;
  let english = 0;
  let numeric = 0;
  let totalChars = 0;
  const byLength: Record<LengthBucket, number> = {
    short: 0,
    medium: 0,
    long: 0,
    xlong: 0,
  };
  const uniqueSet = new Set<string>();

  for (const raw of tags) {
    const tag = raw.startsWith('#') ? raw : '#' + raw;
    const content = tag.replace(/^#/, '');
    if (!content) continue;

    uniqueSet.add(content.toLowerCase());
    totalChars += content.length;

    if (isRussianHashtag(tag)) {
      russian++;
    } else if (/[a-zA-Z]/.test(content)) {
      english++;
    } else if (/^\d+$/.test(content)) {
      numeric++;
    }

    byLength[getLengthBucket(tag)]++;
  }

  const total = tags.length;
  return {
    total,
    unique: uniqueSet.size,
    russian,
    english,
    numeric,
    byLength,
    avgLength: total > 0 ? Math.round((totalChars / total) * 10) / 10 : 0,
  };
}
