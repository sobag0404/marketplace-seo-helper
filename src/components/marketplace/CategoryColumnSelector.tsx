'use client';

import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Columns3, Tag, CheckCircle2, AlertTriangle, Info, Layers, Sparkles,
} from 'lucide-react';
import {
  matchCategoryFromText,
  type CategoryMatchQuality,
} from '@/lib/marketplace/categoryUtils';
import type { TableRow } from '@/lib/marketplace/types';

export type CategorySourceMode = 'single' | 'column';

interface CategoryColumnSelectorProps {
  /** Available column headers from the parsed file */
  headers: string[];
  /** Current mode: 'single' = one category for all rows, 'column' = per-row */
  mode: CategorySourceMode;
  /** Selected category column header (when mode === 'column') */
  selectedColumn: string;
  /** Callback to change the mode */
  onModeChange: (mode: CategorySourceMode) => void;
  /** Callback to change the selected column */
  onColumnChange: (column: string) => void;
  /** Parsed rows — used to compute match preview (how many rows match) */
  rows: TableRow[];
  /** Auto-detected category column index (if any), for the «Авто» badge */
  detectedColumn?: number | null;
}

/** Aggregate match statistics for the preview */
interface MatchStats {
  total: number;
  matched: number;
  unmatched: number;
  byQuality: Record<CategoryMatchQuality, number>;
  /** Up to 5 unique example matches (input → category name) */
  examples: { input: string; category: string; quality: CategoryMatchQuality }[];
  /** Up to 5 unique unmatched inputs */
  unmatchedExamples: string[];
}

const QUALITY_LABEL: Record<CategoryMatchQuality, string> = {
  exact: 'Точное',
  normalized: 'Норм.',
  fuzzy: 'Fuzzy',
  none: '—',
};

const QUALITY_COLOR: Record<CategoryMatchQuality, string> = {
  exact: 'border-emerald-300 bg-emerald-50/70 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  normalized: 'border-teal-300 bg-teal-50/70 text-teal-700 dark:border-teal-700 dark:bg-teal-950/30 dark:text-teal-300',
  fuzzy: 'border-amber-300 bg-amber-50/70 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  none: 'border-muted-foreground/20 bg-muted/40 text-muted-foreground',
};

/**
 * Category source selector: choose between «one category for all rows»
 * (the default single-category mode) and «category from column» (per-row
 * category taken from a chosen Excel column and fuzzy-matched to Ozon
 * categories).
 *
 * Use case: a seller has a single Excel file with products from many
 * different categories (e.g. пледы, постельное белье, полотенца). Instead
 * of generating hashtags one category at a time, they pick the «Категория»
 * column and the tool generates per-row hashtags from each row's category.
 *
 * UI:
 *  - Mode toggle: two pill buttons (Одна для всех / Из колонки)
 *  - When in column mode:
 *    - Column picker dropdown
 *    - Match preview: «Совпадений: X из Y строк» + quality breakdown
 *    - Example matches (up to 5)
 *    - Unmatched examples (up to 5) with a hint to check spelling
 */
export function CategoryColumnSelector({
  headers,
  mode,
  selectedColumn,
  onModeChange,
  onColumnChange,
  rows,
  detectedColumn,
}: CategoryColumnSelectorProps) {
  // Compute match preview when in column mode
  const matchStats: MatchStats = useMemo(() => {
    const stats: MatchStats = {
      total: 0,
      matched: 0,
      unmatched: 0,
      byQuality: { exact: 0, normalized: 0, fuzzy: 0, none: 0 },
      examples: [],
      unmatchedExamples: [],
    };
    if (mode !== 'column' || !selectedColumn) return stats;

    const seenExamples = new Set<string>();
    const seenUnmatched = new Set<string>();

    for (const row of rows) {
      const raw = row.cells[selectedColumn];
      if (raw == null || String(raw).trim() === '') continue;
      const input = String(raw).trim();
      stats.total++;

      const result = matchCategoryFromText(input);
      stats.byQuality[result.quality]++;

      if (result.category) {
        stats.matched++;
        const key = `${input}→${result.category.name}`;
        if (!seenExamples.has(key) && stats.examples.length < 5) {
          seenExamples.add(key);
          stats.examples.push({
            input,
            category: result.category.name,
            quality: result.quality,
          });
        }
      } else {
        stats.unmatched++;
        const norm = result.normalizedInput;
        if (!seenUnmatched.has(norm) && stats.unmatchedExamples.length < 5) {
          seenUnmatched.add(norm);
          stats.unmatchedExamples.push(input);
        }
      }
    }

    return stats;
  }, [mode, selectedColumn, rows]);

  const isAutoDetected =
    detectedColumn !== null &&
    detectedColumn !== undefined &&
    headers[detectedColumn] === selectedColumn &&
    !!selectedColumn;

  const matchRate = matchStats.total > 0
    ? Math.round((matchStats.matched / matchStats.total) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-violet-200/40 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/30 via-purple-50/20 to-fuchsia-50/20 dark:from-violet-950/10 dark:via-purple-950/5 dark:to-fuchsia-950/5 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="h-6 w-6 rounded-md bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white flex items-center justify-center shadow-sm shrink-0">
          <Layers className="h-3.5 w-3.5" />
        </span>
        <span>Источник категорий</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Выберите: одна категория для всех строк — или колонка с категориями,
              где каждая строка получит хештеги из своей категории.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Mode toggle — two pill buttons */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted/40 border border-muted-foreground/10">
        <button
          type="button"
          onClick={() => onModeChange('single')}
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            mode === 'single'
              ? 'bg-background shadow-sm text-foreground border border-violet-200 dark:border-violet-800'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
          aria-pressed={mode === 'single'}
        >
          <Tag className="h-3.5 w-3.5" />
          Одна для всех
        </button>
        <button
          type="button"
          onClick={() => onModeChange('column')}
          className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            mode === 'column'
              ? 'bg-background shadow-sm text-foreground border border-violet-200 dark:border-violet-800'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
          aria-pressed={mode === 'column'}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Из колонки
        </button>
      </div>

      {/* Column picker — only visible in column mode */}
      {mode === 'column' && (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-xs font-medium text-muted-foreground min-w-[120px] flex items-center gap-1.5">
              Колонка с категорией:
              {isAutoDetected && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-[9px] px-1 py-0 h-3.5">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Авто
                </Badge>
              )}
            </label>
            <Select value={selectedColumn} onValueChange={onColumnChange}>
              <SelectTrigger className="w-full sm:flex-1 h-8 text-xs">
                <SelectValue placeholder="Выберите колонку…" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header, idx) => (
                  <SelectItem key={idx} value={header} className="text-xs">
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Match preview */}
          {selectedColumn && matchStats.total > 0 ? (
            <div className="rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-background/60 dark:bg-background/30 p-2.5 space-y-2">
              {/* Summary row */}
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="font-medium text-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Совпадений:
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 tabular-nums ${
                  matchRate >= 80
                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                    : matchRate >= 50
                    ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                    : 'border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300'
                }`}>
                  {matchStats.matched} / {matchStats.total} ({matchRate}%)
                </Badge>
                {matchStats.unmatched > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300 tabular-nums">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    {matchStats.unmatched} не распознано
                  </Badge>
                )}
                {/* Quality breakdown */}
                <div className="flex items-center gap-1 ml-auto">
                  {(['exact', 'normalized', 'fuzzy'] as CategoryMatchQuality[]).map(q => {
                    const count = matchStats.byQuality[q];
                    if (count === 0) return null;
                    return (
                      <Tooltip key={q}>
                        <TooltipTrigger asChild>
                          <span className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0 rounded border ${QUALITY_COLOR[q]} cursor-help tabular-nums`}>
                            {QUALITY_LABEL[q]}: {count}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {q === 'exact' && 'Точное совпадение названия категории'}
                            {q === 'normalized' && 'Совпадение после нормализации (регистр, ё→е, пробелы)'}
                            {q === 'fuzzy' && 'Нечёткое совпадение: все слова найдены в названии'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              {/* Examples */}
              {matchStats.examples.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground/70 italic">
                    Примеры совпадений:
                  </span>
                  <div className="flex flex-col gap-0.5 max-h-28 overflow-y-auto custom-scrollbar">
                    {matchStats.examples.map((ex, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-muted-foreground truncate max-w-[120px]" title={ex.input}>
                          «{ex.input}»
                        </span>
                        <span className="text-muted-foreground/50">→</span>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 ${QUALITY_COLOR[ex.quality]}`}>
                          {QUALITY_LABEL[ex.quality]}
                        </Badge>
                        <span className="text-violet-600 dark:text-violet-400 truncate flex-1" title={ex.category}>
                          {ex.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched examples */}
              {matchStats.unmatchedExamples.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-rose-200/40 dark:border-rose-800/30">
                  <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 italic flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Не распознано (проверьте написание):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {matchStats.unmatchedExamples.map((u, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-200/60 dark:border-rose-800/40 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
                        title={u}
                      >
                        «{u.length > 30 ? u.slice(0, 30) + '…' : u}»
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : selectedColumn ? (
            <div className="rounded-lg border border-muted-foreground/10 bg-muted/20 p-2.5 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <Info className="h-3 w-3 shrink-0" />
              <span>В колонке «{selectedColumn}» нет данных — выберите другую колонку.</span>
            </div>
          ) : (
            <div className="rounded-lg border border-muted-foreground/10 bg-muted/20 p-2.5 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <Info className="h-3 w-3 shrink-0" />
              <span>Выберите колонку с категориями, чтобы увидеть предпросмотр совпадений.</span>
            </div>
          )}
        </div>
      )}

      {/* Hint for single mode */}
      {mode === 'single' && (
        <div className="text-[10px] text-muted-foreground/70 italic flex items-center gap-1">
          <Info className="h-2.5 w-2.5 shrink-0" />
          <span>
            Выберите категорию Ozon выше — она применится ко всем строкам файла.
            Для разных категорий в каждой строке переключитесь на «Из колонки».
          </span>
        </div>
      )}
    </div>
  );
}
