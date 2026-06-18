'use client';

import { useSyncExternalStore, useCallback } from 'react';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { getCategoryGroup } from '@/lib/marketplace/categoryUtils';
import { Badge } from '@/components/ui/badge';
import { History, X, Star } from 'lucide-react';

const STORAGE_KEY_RECENT = 'msh-recent-categories';
const STORAGE_KEY_FAV = 'msh-fav-categories';
const MAX_RECENT = 6;
const MAX_FAV = 12;

interface Entry {
  id: string;
  ts: number;
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

function subscribeBoth(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedRecentRaw = undefined;
    cachedFavRaw = undefined;
    callback();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('msh-recent-change', handler);
  window.addEventListener('msh-fav-change', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('msh-recent-change', handler);
    window.removeEventListener('msh-fav-change', handler);
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

/**
 * Hook for recently-used Ozon categories (LRU history).
 */
export function useRecentCategories() {
  const recent = useSyncExternalStore(subscribeBoth, readRecent, getServerRecent);

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
  const favorites = useSyncExternalStore(subscribeBoth, readFavorites, getServerFavorites);

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

interface RecentCategoriesProps {
  recent: Entry[];
  favorites: Entry[];
  selectedCategoryId: string | null;
  onCategoryChange: (id: string, category: OzonCategory | null) => void;
  onClear: () => void;
  onToggleFavorite: (id: string) => void;
}

/**
 * Quick-access chips for favorites (★) and recently used (history) categories.
 * Pure display component — state managed by hooks in parent.
 */
export function RecentCategories({
  recent,
  favorites,
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

  if (resolvedFav.length === 0 && resolvedRecent.length === 0) return null;

  const renderChip = (cat: OzonCategory, kind: 'fav' | 'recent') => {
    const group = getCategoryGroup(cat.id);
    const isActive = cat.id === selectedCategoryId;
    const isFav = kind === 'fav';
    return (
      <Badge
        key={`${kind}-${cat.id}`}
        variant="outline"
        className={`
          cursor-pointer text-xs transition-all duration-200 gap-1 px-2 py-0.5 group/chip
          ${
            isActive
              ? isFav
                ? 'border-amber-400 bg-amber-100/80 text-amber-800 dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200'
                : 'border-emerald-400 bg-emerald-100/70 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200'
              : isFav
                ? 'border-amber-200/70 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
                : 'border-amber-200/70 bg-amber-50/60 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300 dark:hover:bg-amber-900/30'
          }
        `}
        onClick={() => onCategoryChange(cat.id, cat)}
      >
        <span>{group?.emoji ?? '📦'}</span>
        <span className="truncate max-w-[140px]">{cat.name}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(cat.id);
          }}
          className="ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-amber-200/60 dark:hover:bg-amber-800/40 transition-colors p-0.5"
          aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
          title={isFav ? 'Убрать из избранного' : 'В избранное'}
        >
          <Star
            className={`h-3 w-3 transition-all ${
              isFav
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
    </div>
  );
}
