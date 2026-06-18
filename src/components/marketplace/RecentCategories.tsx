'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { getCategoryGroup } from '@/lib/marketplace/categoryUtils';
import { Badge } from '@/components/ui/badge';
import { History, X } from 'lucide-react';

const STORAGE_KEY = 'msh-recent-categories';
const MAX_RECENT = 6;

interface RecentEntry {
  id: string;
  ts: number;
}

function parseRecent(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.id === 'string' && typeof e.ts === 'number')
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** In-memory cache so getSnapshot returns a stable reference when unchanged */
let cachedRaw: string | null | undefined = undefined;
let cachedParsed: RecentEntry[] = [];

function readStore(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = parseRecent(raw);
  return cachedParsed;
}

/** Stable empty array for server snapshot (must be cached to avoid infinite loop) */
const SERVER_SNAPSHOT: RecentEntry[] = [];

function getServerSnapshot(): RecentEntry[] {
  return SERVER_SNAPSHOT;
}

/**
 * Subscribe to localStorage changes (cross-tab via 'storage' event,
 * same-tab via a custom event dispatched by saveRecent).
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedRaw = undefined; // invalidate cache
    callback();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('msh-recent-change', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('msh-recent-change', handler);
  };
}

function saveRecent(entries: RecentEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
    cachedRaw = undefined; // invalidate cache
    window.dispatchEvent(new Event('msh-recent-change'));
  } catch {
    // ignore quota errors
  }
}

/**
 * Hook that manages recently-used Ozon categories in localStorage.
 * Uses useSyncExternalStore for hydration-safe reads (no setState-in-effect).
 * `record(id)` is called from event handlers (e.g. onCategoryChange).
 */
export function useRecentCategories() {
  const recent = useSyncExternalStore(subscribe, readStore, getServerSnapshot);

  const record = useCallback((id: string) => {
    const current = readStore();
    const without = current.filter((e) => e.id !== id);
    const next = [{ id, ts: Date.now() }, ...without].slice(0, MAX_RECENT);
    saveRecent(next);
  }, []);

  const clear = useCallback(() => {
    saveRecent([]);
  }, []);

  return { recent, record, clear };
}

interface RecentCategoriesProps {
  recent: RecentEntry[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string, category: OzonCategory | null) => void;
  onClear: () => void;
}

/**
 * Quick-access chips for recently used Ozon categories.
 * Pure display component — state managed by useRecentCategories hook in parent.
 */
export function RecentCategories({
  recent,
  selectedCategoryId,
  onCategoryChange,
  onClear,
}: RecentCategoriesProps) {
  if (recent.length === 0) return null;

  // Resolve entries to categories (skip deleted IDs)
  const resolved = recent
    .map((e) => {
      const cat = OZON_CATEGORIES.find((c) => c.id === e.id);
      return cat ? { entry: e, cat } : null;
    })
    .filter((x): x is { entry: RecentEntry; cat: OzonCategory } => x !== null);

  if (resolved.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <History className="h-3 w-3 text-amber-500" />
        Недавние:
      </span>
      {resolved.map(({ cat }) => {
        const group = getCategoryGroup(cat.id);
        const isActive = cat.id === selectedCategoryId;
        return (
          <Badge
            key={cat.id}
            variant="outline"
            className={`
              cursor-pointer text-xs transition-all duration-200 gap-1 px-2 py-0.5
              ${
                isActive
                  ? 'border-emerald-400 bg-emerald-100/70 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'border-amber-200/70 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
              }
            `}
            onClick={() => onCategoryChange(cat.id, cat)}
          >
            <span>{group?.emoji ?? '📦'}</span>
            <span className="truncate max-w-[140px]">{cat.name}</span>
          </Badge>
        );
      })}
      <button
        onClick={onClear}
        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors px-1"
        aria-label="Очистить недавние категории"
        title="Очистить историю"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
