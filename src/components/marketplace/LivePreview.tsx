'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Sparkles, Hash, Tag, AlertCircle, Copy, Check, Layers, Ban } from 'lucide-react';
import { generateHashtagsFromCategory, generateHashtagsFromMultipleCategories, getCategoryGroup } from '@/lib/marketplace/categoryUtils';
import type { OzonCategory } from '@/lib/marketplace/ozonCategories';
import { useBlacklistSet, filterHashtagsByBlacklist } from './useHashtagBlacklist';

interface LivePreviewProps {
  category: OzonCategory | null;
  productType: string | null;
  customKeywords: string[];
  targetCount: number;
  /** Sample product name (from first data row if available) */
  sampleName?: string;
  /** Secondary categories whose hashtags are merged with the primary category */
  secondaryCategoryIds?: string[];
}

/**
 * Live preview card shown in the configure step.
 * Displays sample hashtags generated from the current category + type + keywords,
 * so the user sees what they'll get BEFORE clicking "Generate".
 *
 * Includes:
 *  - Tag count badge
 *  - Semantic group label
 *  - Multi-category indicator (Layers icon) when secondary categories are selected
 *  - Copy-to-clipboard button (one click → all preview tags)
 *  - Staggered tag-enter animation
 *  - 3-tier color highlight (top-3 teal, 4-6 emerald, rest muted)
 */
export function LivePreview({
  category,
  productType,
  customKeywords,
  targetCount,
  sampleName,
  secondaryCategoryIds = [],
}: LivePreviewProps) {
  const [copied, setCopied] = useState(false);
  const blacklist = useBlacklistSet();

  const preview = useMemo(() => {
    if (!category) return null;

    const allTags = secondaryCategoryIds.length > 0
      ? generateHashtagsFromMultipleCategories(
          category.id,
          secondaryCategoryIds,
          productType ?? undefined,
          customKeywords,
          sampleName
        )
      : generateHashtagsFromCategory(
          category.id,
          productType ?? undefined,
          customKeywords,
          sampleName
        );
    const filtered = filterHashtagsByBlacklist(allTags, blacklist);
    return filtered.slice(0, targetCount);
  }, [category, productType, customKeywords, sampleName, targetCount, secondaryCategoryIds, blacklist]);

  // Track how many tags were removed by the blacklist (for UI hint)
  const blacklistedCount = useMemo(() => {
    if (!category) return 0;
    const allTags = secondaryCategoryIds.length > 0
      ? generateHashtagsFromMultipleCategories(
          category.id,
          secondaryCategoryIds,
          productType ?? undefined,
          customKeywords,
          sampleName
        )
      : generateHashtagsFromCategory(
          category.id,
          productType ?? undefined,
          customKeywords,
          sampleName
        );
    if (blacklist.size === 0) return 0;
    return allTags.length - filterHashtagsByBlacklist(allTags, blacklist).length;
  }, [category, productType, customKeywords, sampleName, secondaryCategoryIds, blacklist]);

  const handleCopy = useCallback(async () => {
    if (!preview || preview.length === 0) return;
    const text = preview.join(' ');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [preview]);

  if (!category) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            Выберите категорию Ozon, чтобы увидеть предварительный набор хештегов.
          </span>
        </CardContent>
      </Card>
    );
  }

  const group = getCategoryGroup(category.id);

  return (
    <Card className="shadow-sm border-teal-200/60 dark:border-teal-800/40 bg-gradient-to-br from-teal-50/40 via-emerald-50/30 to-cyan-50/20 dark:from-teal-950/15 dark:via-emerald-950/10 dark:to-cyan-950/10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <h4 className="text-sm font-semibold text-foreground">Предпросмотр хештегов</h4>
            <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-950/30 tabular-nums">
              <Hash className="h-2.5 w-2.5 mr-0.5" />
              {preview?.length ?? 0} шт.
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span className="truncate max-w-[180px]">
                {group ? `${group.emoji} ${group.name}` : category.name}
              </span>
            </div>
            {secondaryCategoryIds.length > 0 && (
              <Badge variant="outline" className="text-[10px] border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400 bg-violet-50/60 dark:bg-violet-950/30 gap-0.5">
                <Layers className="h-2.5 w-2.5" />
                +{secondaryCategoryIds.length}
              </Badge>
            )}
            {blacklistedCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 gap-0.5 cursor-help">
                    <Ban className="h-2.5 w-2.5" />
                    −{blacklistedCount}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Заблокировано стоп-листом: {blacklistedCount} шт.</p>
                </TooltipContent>
              </Tooltip>
            )}
            {preview && preview.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-all duration-200"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-300" />
                        <span className="text-emerald-600 dark:text-emerald-400">Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Копировать
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Скопировать все {preview.length} хештегов в буфер обмена</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {preview && preview.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {preview.map((tag, idx) => (
              <Badge
                key={tag}
                variant="outline"
                className={`
                  text-xs font-mono animate-tag-enter cursor-default
                  ${idx < 3
                    ? 'border-teal-300 bg-teal-100/70 text-teal-800 dark:border-teal-600 dark:bg-teal-900/40 dark:text-teal-200'
                    : idx < 6
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-muted-foreground/20 bg-muted/40 text-muted-foreground'
                  }
                `}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Не удалось сгенерировать хештеги — попробуйте выбрать тип товара или добавить ключевые слова.
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Образец на основе{sampleName ? ` «${sampleName.slice(0, 40)}${sampleName.length > 40 ? '…' : ''}»` : ' названия категории'}. Финальный результат может отличаться для каждой строки.
        </p>
      </CardContent>
    </Card>
  );
}

