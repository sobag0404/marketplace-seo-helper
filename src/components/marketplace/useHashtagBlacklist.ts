'use client';

import { useSyncExternalStore, useCallback } from 'react';

/**
 * Hashtag blacklist — list of hashtags that should NEVER appear in generated
 * output, even if the generator would have produced them.
 *
 * Stored in localStorage under `msh-hashtag-blacklist`.
 * Format: string[] of hashtags, normalized to lowercase, leading '#' optional
 * but always stripped on read for consistent comparison.
 *
 * Use case: a seller consistently gets an irrelevant hashtag (e.g. #плед for
 * a non-плед product) and wants it permanently excluded without manually
 * deleting it after each generation.
 *
 * Cross-tab sync: dispatches 'msh-blacklist-change' on writes + listens to
 * the native 'storage' event for cross-tab updates.
 */

const STORAGE_KEY = 'msh-hashtag-blacklist';
const MAX_BLACKLIST = 200;

export interface BlacklistEntry {
  /** Hashtag with leading '#' stripped, lowercase */
  tag: string;
  /** ISO timestamp when added */
  addedAt: string;
}

let cachedRaw: string | null | undefined = undefined;
let cachedParsed: BlacklistEntry[] = [];

/** Normalize any user input into a canonical lowercase tag (no leading #) */
export function normalizeBlacklistTag(input: string): string {
  let t = input.trim().toLowerCase();
  // Strip all leading # symbols
  while (t.startsWith('#')) t = t.slice(1);
  // Strip anything that's not a letter/digit/underscore
  t = t.replace(/[^a-zа-яё0-9_]/gi, '');
  return t;
}

function parse(raw: string | null): BlacklistEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: BlacklistEntry[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      // Support both plain strings ("tag") and {tag, addedAt} objects
      let tag: string;
      let addedAt: string;
      if (typeof entry === 'string') {
        tag = normalizeBlacklistTag(entry);
        addedAt = new Date().toISOString();
      } else if (entry && typeof entry === 'object' && typeof entry.tag === 'string') {
        tag = normalizeBlacklistTag(entry.tag);
        addedAt = typeof entry.addedAt === 'string' ? entry.addedAt : new Date().toISOString();
      } else {
        continue;
      }
      if (!tag || tag.length < 1 || seen.has(tag)) continue;
      seen.add(tag);
      result.push({ tag, addedAt });
      if (result.length >= MAX_BLACKLIST) break;
    }
    return result;
  } catch {
    return [];
  }
}

function readStore(): BlacklistEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = parse(raw);
  return cachedParsed;
}

const SERVER_SNAPSHOT: BlacklistEntry[] = [];
function getServerSnapshot(): BlacklistEntry[] {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedRaw = undefined;
    callback();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('msh-blacklist-change', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('msh-blacklist-change', handler);
  };
}

function save(entries: BlacklistEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    cachedRaw = undefined;
    window.dispatchEvent(new Event('msh-blacklist-change'));
  } catch {
    // ignore quota errors
  }
}

function clear() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    cachedRaw = undefined;
    window.dispatchEvent(new Event('msh-blacklist-change'));
  } catch {
    // ignore
  }
}

/** Hook for reading the blacklist (read-only, reactive) */
export function useHashtagBlacklist(): BlacklistEntry[] {
  return useSyncExternalStore(subscribe, readStore, getServerSnapshot);
}

/** Hook for reading blacklist as a Set<string> for fast lookup */
export function useBlacklistSet(): Set<string> {
  const entries = useHashtagBlacklist();
  // Recompute on every change — entries is small (≤200)
  return new Set(entries.map(e => e.tag));
}

/** Hook with imperative actions for managing the blacklist */
export function useBlacklistActions() {
  const add = useCallback((input: string): { ok: boolean; reason?: string; tag?: string } => {
    const tag = normalizeBlacklistTag(input);
    if (!tag) return { ok: false, reason: 'Пустой тег' };
    if (tag.length > 30) return { ok: false, reason: 'Слишком длинный тег (макс. 30)' };
    const current = readStore();
    if (current.some(e => e.tag === tag)) return { ok: false, reason: 'Уже в стоп-листе', tag };
    if (current.length >= MAX_BLACKLIST) return { ok: false, reason: `Максимум ${MAX_BLACKLIST} тегов` };
    save([...current, { tag, addedAt: new Date().toISOString() }]);
    return { ok: true, tag };
  }, []);

  const remove = useCallback((tag: string) => {
    const normalized = normalizeBlacklistTag(tag);
    const current = readStore();
    save(current.filter(e => e.tag !== normalized));
  }, []);

  const clearAll = useCallback(() => {
    clear();
  }, []);

  const importList = useCallback((tags: string[]): { added: number; skipped: number } => {
    const current = readStore();
    const seen = new Set(current.map(e => e.tag));
    let added = 0;
    let skipped = 0;
    const next = [...current];
    for (const raw of tags) {
      const tag = normalizeBlacklistTag(raw);
      if (!tag || tag.length > 30) {
        skipped++;
        continue;
      }
      if (seen.has(tag)) {
        skipped++;
        continue;
      }
      seen.add(tag);
      next.push({ tag, addedAt: new Date().toISOString() });
      added++;
      if (next.length >= MAX_BLACKLIST) break;
    }
    if (added > 0) save(next);
    return { added, skipped };
  }, []);

  return { add, remove, clearAll, importList };
}

/** Filter an array of hashtags (with leading #) against the blacklist */
export function filterHashtagsByBlacklist(hashtags: string[], blacklist: Set<string>): string[] {
  if (blacklist.size === 0) return hashtags;
  return hashtags.filter(tag => {
    const normalized = normalizeBlacklistTag(tag);
    return !blacklist.has(normalized);
  });
}

/** The max blacklist size constant (exported for UI hints) */
export const BLACKLIST_MAX = MAX_BLACKLIST;
