'use client';

import { useState, useEffect } from 'react';
import { useReadAutosave } from './useAutosaveSettings';
import { Save, Clock } from 'lucide-react';

/** Format a relative time string in Russian (e.g. "5 сек назад", "2 мин назад") */
function formatRelative(iso: string): string {
  if (!iso) return '';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return 'только что';
  if (sec < 60) return `${sec} сек назад`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн назад`;
  // For older, show date
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Tiny footer indicator showing when settings were last autosaved.
 * Updates every 15 seconds to keep relative time fresh.
 * Hidden entirely if no autosave exists.
 */
export function LastSavedIndicator() {
  const autosaved = useReadAutosave();
  const [, setTick] = useState(0);

  // Re-render every 15s to refresh relative time
  useEffect(() => {
    if (!autosaved?.savedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, [autosaved?.savedAt]);

  if (!autosaved?.savedAt) return null;

  const relative = formatRelative(autosaved.savedAt);
  const hasCategory = Boolean(autosaved.categoryId);
  const keywordsCount = autosaved.customKeywords.length;

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 h-5 rounded-full border border-emerald-200/40 text-emerald-600/70 dark:border-emerald-800/40 dark:text-emerald-400/70 bg-emerald-50/30 dark:bg-emerald-950/10 tabular-nums"
      title={`Сохранено: ${new Date(autosaved.savedAt).toLocaleString('ru-RU')}${hasCategory ? ` • категория: ${autosaved.categoryId}` : ''}${keywordsCount > 0 ? ` • ключевиков: ${keywordsCount}` : ''}`}
    >
      <Save className="h-2.5 w-2.5" />
      <Clock className="h-2.5 w-2.5 opacity-60" />
      <span>{relative}</span>
    </span>
  );
}
