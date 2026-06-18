'use client';

import { useSyncExternalStore, useCallback, useEffect, useRef } from 'react';
import type { GenerationSettings } from '@/lib/marketplace/types';
import type { ExportFormat } from '@/components/marketplace/ExportFormatSelector';

/**
 * Persisted generator settings — everything needed to resume work after a reload.
 * Kept intentionally small (no file data, no processed rows).
 */
export interface PersistedSettings {
  /** Schema version for forward-compat migration */
  schema: 1;
  /** ISO timestamp of last autosave */
  savedAt: string;
  /** Selected Ozon category id (or null) */
  categoryId: string | null;
  /** Selected product type inside the category (or null) */
  productType: string | null;
  /** Custom keywords (free-form list) */
  customKeywords: string[];
  /** Generation settings */
  generationSettings: GenerationSettings;
  /** Export format */
  exportFormat: ExportFormat;
  /** Merge-on-regen flag */
  mergeOnRegen: boolean;
  /** Name column override (auto-detected normally) */
  selectedNameColumn: string;
  /** Article column override */
  selectedArticleColumn: string;
  /** Secondary categories merged with primary (multi-category feature) */
  secondaryCategoryIds: string[];
}

const STORAGE_KEY = 'msh-autosave-settings';
const MAX_KEYWORDS = 50;
const DEBOUNCE_MS = 600;

/** Sentinel return for "no autosave yet" */
const EMPTY_SETTINGS: PersistedSettings = {
  schema: 1,
  savedAt: '',
  categoryId: null,
  productType: null,
  customKeywords: [],
  generationSettings: {
    targetHashtagCount: 10,
    maxHashtagCount: 30,
    russianFirst: true,
    useRelatedCategories: true,
  },
  exportFormat: 'default',
  mergeOnRegen: false,
  selectedNameColumn: '',
  selectedArticleColumn: '',
  secondaryCategoryIds: [],
};

let cachedRaw: string | null | undefined = undefined;
let cachedParsed: PersistedSettings | null = null;

function parse(raw: string | null): PersistedSettings | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.schema !== 1) return null;
    if (!('generationSettings' in parsed) || !('exportFormat' in parsed)) return null;
    return {
      schema: 1,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
      categoryId: typeof parsed.categoryId === 'string' ? parsed.categoryId : null,
      productType: typeof parsed.productType === 'string' ? parsed.productType : null,
      customKeywords: Array.isArray(parsed.customKeywords) ? parsed.customKeywords.slice(0, MAX_KEYWORDS) : [],
      generationSettings: parsed.generationSettings as GenerationSettings,
      exportFormat: parsed.exportFormat as ExportFormat,
      mergeOnRegen: Boolean(parsed.mergeOnRegen),
      selectedNameColumn: typeof parsed.selectedNameColumn === 'string' ? parsed.selectedNameColumn : '',
      selectedArticleColumn: typeof parsed.selectedArticleColumn === 'string' ? parsed.selectedArticleColumn : '',
      secondaryCategoryIds: Array.isArray(parsed.secondaryCategoryIds)
        ? parsed.secondaryCategoryIds.filter((x: unknown): x is string => typeof x === 'string').slice(0, 5)
        : [],
    };
  } catch {
    return null;
  }
}

function readStore(): PersistedSettings | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = parse(raw);
  return cachedParsed;
}

const SERVER_SNAPSHOT: PersistedSettings | null = null;
function getServerSnapshot(): PersistedSettings | null {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedRaw = undefined;
    callback();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('msh-autosave-change', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('msh-autosave-change', handler);
  };
}

function save(settings: PersistedSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    cachedRaw = undefined;
    window.dispatchEvent(new Event('msh-autosave-change'));
  } catch {
    // ignore quota errors
  }
}

function clear() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = undefined;
    window.dispatchEvent(new Event('msh-autosave-change'));
  } catch {
    // ignore
  }
}

/**
 * Hook for reading persisted autosave settings (read-only).
 * Returns the parsed settings or null if none saved.
 */
export function useReadAutosave(): PersistedSettings | null {
  return useSyncExternalStore(subscribe, readStore, getServerSnapshot);
}

interface UseAutosaveArgs {
  categoryId: string | null;
  productType: string | null;
  customKeywords: string[];
  generationSettings: GenerationSettings;
  exportFormat: ExportFormat;
  mergeOnRegen: boolean;
  selectedNameColumn: string;
  selectedArticleColumn: string;
  /** Secondary categories merged with primary (multi-category feature) */
  secondaryCategoryIds: string[];
  /** Disable autosave (e.g. on upload step where settings aren't yet meaningful) */
  enabled: boolean;
}

/**
 * Debounced autosave of generator settings to localStorage.
 * - Writes 600ms after the last change to avoid thrashing on every keystroke.
 * - Skipped on the upload step (where no file is loaded yet).
 * - Compatible with useReadAutosave (same storage key + dispatch).
 */
export function useAutosaveSettings({
  categoryId,
  productType,
  customKeywords,
  generationSettings,
  exportFormat,
  mergeOnRegen,
  selectedNameColumn,
  selectedArticleColumn,
  secondaryCategoryIds,
  enabled,
}: UseAutosaveArgs) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest values in a ref so the effect doesn't re-run on every change
  const valuesRef = useRef({ categoryId, productType, customKeywords, generationSettings, exportFormat, mergeOnRegen, selectedNameColumn, selectedArticleColumn, secondaryCategoryIds, enabled });
  useEffect(() => {
    valuesRef.current = { categoryId, productType, customKeywords, generationSettings, exportFormat, mergeOnRegen, selectedNameColumn, selectedArticleColumn, secondaryCategoryIds, enabled };
  });

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const v = valuesRef.current;
      // Only save if there's something meaningful to persist
      if (!v.categoryId && v.customKeywords.length === 0 && !v.selectedNameColumn) {
        return;
      }
      const snapshot: PersistedSettings = {
        schema: 1,
        savedAt: new Date().toISOString(),
        categoryId: v.categoryId,
        productType: v.productType,
        customKeywords: v.customKeywords.slice(0, MAX_KEYWORDS),
        generationSettings: v.generationSettings,
        exportFormat: v.exportFormat,
        mergeOnRegen: v.mergeOnRegen,
        selectedNameColumn: v.selectedNameColumn,
        selectedArticleColumn: v.selectedArticleColumn,
        secondaryCategoryIds: v.secondaryCategoryIds.slice(0, 5),
      };
      save(snapshot);
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [categoryId, productType, customKeywords, generationSettings, exportFormat, mergeOnRegen, selectedNameColumn, selectedArticleColumn, secondaryCategoryIds, enabled]);
}

/** Clear the autosaved settings (e.g. on full reset) */
export function clearAutosave() {
  clear();
}

/** Empty default settings (for fallback when no autosave) */
export const EMPTY_PERSISTED_SETTINGS = EMPTY_SETTINGS;

export type { PersistedSettings as AutosaveSettings };
