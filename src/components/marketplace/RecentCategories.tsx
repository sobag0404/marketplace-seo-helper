'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { getCategoryGroup } from '@/lib/marketplace/categoryUtils';
import { Badge } from '@/components/ui/badge';
import { History, X, Star, TrendingUp } from 'lucide-react';

const STORAGE_KEY_RECENT = 'msh-recent-categories';
const STORAGE_KEY_FAV = 'msh-fav-categories';
const STORAGE_KEY_USAGE = 'msh-category-usage';
const MAX_RECENT = 6;
const MAX_FAV = 12;
const MAX_USAGE_ENTRIES = 50;

interface Entry {
  id: string;
  ts: number;
}

interface UsageEntry {
  id: string;
  count: number;
  lastUsed: number;
}

function parseEntries(raw: string | null, max: number): Entry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.id === 'string' && typeof e.ts === 'number')
      .slice(0, max);
  } catch {
    return [];
  }
}

function parseUsage(raw: string | null): UsageEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.id === 'string' && typeof e.count === 'number')
      .slice(0, MAX_USAGE_ENTRIES);
  } catch {
    return [];
  }
}

// ---------- RECENT ----------
let cachedRecentRaw: string | null | undefined = undefined;
let cachedRecentParsed: Entry[] = [];

function readRecent(): Entry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_RECENT);
  if (raw === cachedRecentRaw) return cachedRecentParsed;
  cachedRecentRaw = raw;
  cachedRecentParsed = parseEntries(raw, MAX_RECENT);
  return cachedRecentParsed;
}

const SERVER_RECENT: Entry[] = [];
function getServerRecent(): Entry[] {
  return SERVER_RECENT;
}

// ---------- FAVORITES ----------
let cachedFavRaw: string | null | undefined = undefined;
let cachedFavParsed: Entry[] = [];

function readFavorites(): Entry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_FAV);
  if (raw === cachedFavRaw) return cachedFavParsed;
  cachedFavRaw = raw;
  cachedFavParsed = parseEntries(raw, MAX_FAV);
  return cachedFavParsed;
}

const SERVER_FAV: Entry[] = [];
function getServerFavorites(): Entry[] {
  return SERVER_FAV;
}

// ---------- USAGE STATS ----------
let cachedUsageRaw: string | null | undefined = undefined;
let cachedUsageParsed: UsageEntry[] = [];

function readUsage(): UsageEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_USAGE);
  if (raw === cachedUsageRaw) return cachedUsageParsed;
  cachedUsageRaw = raw;
  cachedUsageParsed = parseUsage(raw);
  return cachedUsageParsed;
}

const SERVER_USAGE: UsageEntry[] = [];
function getServerUsage(): UsageEntry[] {
  return SERVER_USAGE;
}

function subscribeAll(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedRecentRaw = undefined;
    cachedFavRaw = undefined;
    cachedUsageRaw = undefined;
    callback();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('msh-recent-change', handler);
  window.addEventListener('msh-fav-change', handler);
  window.addEventListener('msh-usage-change', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('msh-recent-change', handler);
    window.removeEventListener('msh-fav-change', handler);
    window.removeEventListener('msh-usage-change', handler);
  };
}

function saveRecent(entries: Entry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(entries.slice(0, MAX_RECENT)));
    cachedRecentRaw = undefined;
    window.dispatchEvent(new Event('msh-recent-change'));
  } catch {
    // ignore quota errors
  }
}

function saveFavorites(entries: Entry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(entries.slice(0, MAX_FAV)));
    cachedFavRaw = undefined;
    window.dispatchEvent(new Event('msh-fav-change'));
  } catch {
    // ignore quota errors
  }
}

function saveUsage(entries: UsageEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(entries.slice(0, MAX_USAGE_ENTRIES)));
    cachedUsageRaw = undefined;
    window.dispatchEvent(new Event('msh-usage-change'));
  } catch {
    // ignore quota errors
  }
}

/**
 * Hook for recently-used Ozon categories (LRU history).
 */
export function useRecentCategories() {
  const recent = useSyncExternalStore(subscribeAll, readRecent, getServerRecent);

  const record = useCallback((id: string) => {
    const current = readRecent();
    const without = current.filter((e) => e.id !== id);
    const next = [{ id, ts: Date.now() }, ...without].slice(0, MAX_RECENT);
    saveRecent(next);
  }, []);

  const clear = useCallback(() => {
    saveRecent([]);
  }, []);

  return { recent, record, clear };
}

/**
 * Hook for favorited Ozon categories (manually starred, persistent).
 */
export function useCategoryFavorites() {
  const favorites = useSyncExternalStore(subscribeAll, readFavorites, getServerFavorites);

  const toggle = useCallback((id: string) => {
    const current = readFavorites();
    if (current.some((e) => e.id === id)) {
      // remove
      saveFavorites(current.filter((e) => e.id !== id));
    } else {
      // add (preserve order by ts)
      const next = [...current, { id, ts: Date.now() }].slice(0, MAX_FAV);
      saveFavorites(next);
    }
  }, []);

  const remove = useCallback((id: string) => {
    const current = readFavorites();
    saveFavorites(current.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => {
    saveFavorites([]);
  }, []);

  return { favorites, toggle, remove, clear };
}

/**
 * Hook for category usage statistics (how many times each category was used).
 * Useful for identifying most-used categories over time.
 */
export function useCategoryUsage() {
  const usage = useSyncExternalStore(subscribeAll, readUsage, getServerUsage);

  const recordUse = useCallback((id: string) => {
    const current = readUsage();
    const existing = current.find((e) => e.id === id);
    let next: UsageEntry[];
    if (existing) {
      next = current
        .map((e) => e.id === id ? { ...e, count: e.count + 1, lastUsed: Date.now() } : e)
        .sort((a, b) => b.count - a.count);
    } else {
      next = [{ id, count: 1, lastUsed: Date.now() }, ...current].slice(0, MAX_USAGE_ENTRIES);
    }
    saveUsage(next);
  }, []);

  const getCount = useCallback((id: string): number => {
    return readUsage().find((e) => e.id === id)?.count ?? 0;
  }, []);

  const clear = useCallback(() => {
    saveUsage([]);
  }, []);

  return { usage, recordUse, getCount, clear };
}

interface RecentCategoriesProps {
  recent: Entry[];
  favorites: Entry[];
  usage: UsageEntry[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string, category: OzonCategory | null) => void;
  onClear: () => void;
  onToggleFavorite: (id: string) => void;
}

/**
 * Quick-access chips for favorites (★) and recently used (history) categories.
 * Shows usage count badge on each chip (how many times category was used total).
 * Pure display component — state managed by hooks in parent.
 */
export function RecentCategories({
  recent,
  favorites,
  usage,
  selectedCategoryId,
  onCategoryChange,
  onClear,
  onToggleFavorite,
}: RecentCategoriesProps) {
  const resolveEntries = (entries: Entry[]) =>
    entries
      .map((e) => {
        const cat = OZON_CATEGORIES.find((c) => c.id === e.id);
        return cat ? { entry: e, cat } : null;
      })
      .filter((x): x is { entry: Entry; cat: OzonCategory } => x !== null);

  const resolvedFav = resolveEntries(favorites);
  const resolvedRecent = resolveEntries(recent).filter(
    (r) => !favorites.some((f) => f.id === r.cat.id) // hide recent if already in favorites
  );

  // Top categories by usage (top 3, excluding those already shown in favorites)
  const topByUsage = usage
    .filter((u) => !favorites.some((f) => f.id === u.id))
    .slice(0, 3)
    .map((u) => {
      const cat = OZON_CATEGORIES.find((c) => c.id === u.id);
      return cat ? { entry: u, cat } : null;
    })
    .filter((x): x is { entry: UsageEntry; cat: OzonCategory } => x !== null);

  if (resolvedFav.length === 0 && resolvedRecent.length === 0 && topByUsage.length === 0) return null;

  const getUsageCount = (id: string): number => usage.find((u) => u.id === id)?.count ?? 0;

  const renderChip = (cat: OzonCategory, kind: 'fav' | 'recent' | 'top') => {
    const group = getCategoryGroup(cat.id);
    const isActive = cat.id === selectedCategoryId;
    const count = getUsageCount(cat.id);

    const baseActive = kind === 'fav'
      ? 'border-amber-400 bg-amber-100/80 text-amber-800 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200'
      : kind === 'top'
        ? 'border-violet-400 bg-violet-100/70 text-violet-800 dark:border-violet-600 dark:bg-violet-900/40 dark:text-violet-200'
        : 'border-emerald-400 bg-emerald-100/70 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200';

    const baseIdle = kind === 'fav'
      ? 'border-amber-200/70 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
      : kind === 'top'
        ? 'border-violet-200/70 bg-violet-50/60 text-violet-700 hover:bg-violet-100 hover:border-violet-300 dark:border-violet-800/50 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:bg-violet-900/30'
        : 'border-amber-200/70 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30';

    return (
      <Badge
        key={`${kind}-${cat.id}`}
        variant="outline"
        className={`cursor-pointer text-xs transition-all duration-200 gap-1 px-2 py-0.5 group/chip ${isActive ? baseActive : baseIdle}`}
        onClick={() => onCategoryChange(cat.id, cat)}
      >
        <span>{group?.emoji ?? '📦'}</span>
        <span className="truncate max-w-[140px]">{cat.name}</span>
        {count > 0 && (
          <span
            className="text-[9px] font-mono px-1 py-0 rounded-full bg-foreground/8 text-foreground/70 tabular-nums leading-none"
            title={`Использована ${count} раз`}
          >
            {count}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(cat.id);
          }}
          className="ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-amber-200/60 dark:hover:bg-amber-800/40 transition-colors p-0.5"
          aria-label={kind === 'fav' ? 'Убрать из избранного' : 'В избранное'}
          title={kind === 'fav' ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star
            className={`h-3 w-3 transition-all ${
              kind === 'fav'
                ? 'fill-amber-500 text-amber-500'
                : 'text-muted-foreground/50 group-hover/chip:text-amber-500'
            }`}
          />
        </button>
      </Badge>
    );
  };

  return (
    <div className="space-y-1.5">
      {resolvedFav.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
            Избранное:
          </span>
          {resolvedFav.map(({ cat }) => renderChip(cat, 'fav'))}
        </div>
      )}
      {resolvedRecent.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <History className="h-3 w-3 text-amber-500" />
            Недавние:
          </span>
          {resolvedRecent.map(({ cat }) => renderChip(cat, 'recent'))}
          <button
            onClick={onClear}
            className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors px-1"
            aria-label="Очистить недавние категории"
            title="Очистить историю"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {topByUsage.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-violet-500" />
            Частые:
          </span>
          {topByUsage.map(({ cat }) => renderChip(cat, 'top'))}
        </div>
      )}
    </div>
  );
}

