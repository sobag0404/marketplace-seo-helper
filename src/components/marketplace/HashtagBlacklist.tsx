'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Ban, Plus, X, Trash2, AlertCircle, Shield, Sparkles,
} from 'lucide-react';
import {
  useHashtagBlacklist,
  useBlacklistActions,
  normalizeBlacklistTag,
  BLACKLIST_MAX,
} from './useHashtagBlacklist';

interface HashtagBlacklistProps {
  /** Optional: tags currently visible in the live preview, to suggest one-tap bans */
  recentHashtags?: string[];
  /** Toast callback */
  onToast?: (title: string, description: string, variant?: 'default' | 'destructive') => void;
}

/**
 * Hashtag Blacklist UI component.
 *
 * Lets users maintain a persistent list of hashtags that should never appear
 * in generated output. Stored in localStorage (cross-tab synced).
 *
 * Features:
 *  - Input with Enter-to-add and validation
 *  - Quick-add chips from recent preview hashtags (one-tap ban)
 *  - Removable chips with hover X
 *  - Clear-all with confirmation
 *  - Count badge (X / MAX)
 *  - Empty-state hint explaining the purpose
 *  - Collapsible by default to avoid taking vertical space on first visit
 */
export function HashtagBlacklist({
  recentHashtags = [],
  onToast,
}: HashtagBlacklistProps) {
  const entries = useHashtagBlacklist();
  const { add, remove, clearAll } = useBlacklistActions();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(entries.length > 0);
  const confirmClearRef = useRef(false);

  // Quick-add: filter recent hashtags to those not yet blacklisted
  const quickAddSuggestions = useMemo(() => {
    if (recentHashtags.length === 0) return [];
    const banned = new Set(entries.map(e => e.tag));
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of recentHashtags) {
      const normalized = normalizeBlacklistTag(tag);
      if (banned.has(normalized)) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(tag);
      if (result.length >= 8) break;
    }
    return result;
  }, [recentHashtags, entries]);

  const handleAdd = useCallback((raw: string) => {
    const result = add(raw);
    if (result.ok) {
      onToast?.('Добавлен в стоп-лист', `#${result.tag}`);
    } else if (result.reason === 'Уже в стоп-листе') {
      // Silent — already banned, no need to spam
    } else {
      onToast?.('Не удалось добавить', result.reason ?? 'Ошибка', 'destructive');
    }
    setInput('');
  }, [add, onToast]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleAdd(input);
  }, [input, handleAdd]);

  const handleRemove = useCallback((tag: string) => {
    remove(tag);
  }, [remove]);

  const handleClearAll = useCallback(() => {
    if (!confirmClearRef.current) {
      confirmClearRef.current = true;
      onToast?.('Подтвердите очистку', 'Нажмите «Очистить» ещё раз в течение 3 сек', 'destructive');
      setTimeout(() => { confirmClearRef.current = false; }, 3000);
      return;
    }
    confirmClearRef.current = false;
    clearAll();
    onToast?.('Стоп-лист очищен', 'Все теги удалены');
  }, [clearAll, onToast]);

  const isFull = entries.length >= BLACKLIST_MAX;

  return (
    <Card className={`shadow-sm border transition-all duration-300 ${
      entries.length > 0
        ? 'border-rose-200/60 dark:border-rose-800/40 bg-gradient-to-br from-rose-50/40 via-background to-orange-50/20 dark:from-rose-950/10 dark:via-background dark:to-orange-950/5'
        : 'border-dashed border-muted-foreground/20 bg-muted/10'
    }`}>
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80 transition-opacity group"
            aria-expanded={isOpen}
          >
            <span className={`h-6 w-6 rounded-md flex items-center justify-center transition-colors ${
              entries.length > 0
                ? 'bg-gradient-to-br from-rose-400 to-orange-500 text-white shadow-sm'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Ban className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground">Стоп-лист хештегов</span>
            {entries.length > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 tabular-nums">
                {entries.length}
                {isFull && ' max'}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground/70 group-hover:text-muted-foreground transition-colors ml-0.5">
              {isOpen ? '▲' : '▼'}
            </span>
          </button>

          {entries.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-6 px-2 gap-1 text-[10px] text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Очистить
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Двойной клик для подтверждения</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {isOpen && (
          <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Add input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Ban className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Введите тег для блокировки (например, плед)…"
                  className="h-8 pl-8 pr-2 text-xs border-rose-200/60 dark:border-rose-800/40 focus-visible:ring-rose-300 dark:focus-visible:ring-rose-700"
                  maxLength={32}
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isFull}
                size="sm"
                className="h-8 px-2.5 gap-1 text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all duration-200"
              >
                <Plus className="h-3 w-3" />
                Бан
              </Button>
            </form>

            {/* Quick-add from recent preview hashtags */}
            {quickAddSuggestions.length > 0 && (
              <div className="flex items-start gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground/70 italic flex items-center gap-0.5 pt-0.5">
                  <Sparkles className="h-2.5 w-2.5" />
                  Быстрый бан:
                </span>
                {quickAddSuggestions.map((tag) => {
                  const normalized = normalizeBlacklistTag(tag);
                  return (
                    <button
                      key={normalized}
                      type="button"
                      onClick={() => handleAdd(tag)}
                      className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md border border-muted-foreground/20 bg-muted/40 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:border-rose-700 dark:hover:text-rose-400 transition-all duration-150 font-mono"
                      title={`Заблокировать ${tag}`}
                    >
                      {tag}
                      <Ban className="h-2.5 w-2.5" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Blacklisted tags */}
            {entries.length > 0 ? (
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {entries.map((entry) => (
                  <Badge
                    key={entry.tag}
                    variant="outline"
                    className="gap-0.5 px-1.5 py-0.5 text-[11px] font-mono border-rose-300 bg-rose-50/60 text-rose-700 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300 group/chip line-through decoration-rose-400/60 decoration-1"
                  >
                    <span className="opacity-60">#</span>
                    <span>{entry.tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.tag)}
                      className="ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-rose-200/60 dark:hover:bg-rose-800/40 transition-colors p-0.5"
                      aria-label="Разблокировать"
                      title="Убрать из стоп-листа"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70 italic py-0.5">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  Стоп-лист пуст. Теги, добавленные сюда, больше не появятся в сгенерированных хештегах.
                </span>
              </div>
            )}

            {/* Footer hint */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 pt-0.5">
              <Shield className="h-2.5 w-2.5 shrink-0" />
              <span>
                Хранится в браузере (localStorage) • {entries.length}/{BLACKLIST_MAX} •
                применяется при генерации и в предпросмотре
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
