'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Hash, Tag, AlertCircle } from 'lucide-react';
import { generateHashtagsFromCategory, getCategoryGroup } from '@/lib/marketplace/categoryUtils';
import type { OzonCategory } from '@/lib/marketplace/ozonCategories';

interface LivePreviewProps {
  category: OzonCategory | null;
  productType: string | null;
  customKeywords: string[];
  targetCount: number;
  /** Sample product name (from first data row if available) */
  sampleName?: string;
}

/**
 * Live preview card shown in the configure step.
 * Displays sample hashtags generated from the current category + type + keywords,
 * so the user sees what they'll get BEFORE clicking "Generate".
 */
export function LivePreview({
  category,
  productType,
  customKeywords,
  targetCount,
  sampleName,
}: LivePreviewProps) {
  const preview = useMemo(() => {
    if (!category) return null;

    const tags = generateHashtagsFromCategory(
      category.id,
      productType ?? undefined,
      customKeywords,
      sampleName
    ).slice(0, targetCount);

    return tags;
  }, [category, productType, customKeywords, sampleName, targetCount]);

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
            <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-950/30">
              <Hash className="h-2.5 w-2.5 mr-0.5" />
              {preview?.length ?? 0} шт.
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span className="truncate max-w-[200px]">
              {group ? `${group.emoji} ${group.name}` : category.name}
            </span>
          </div>
        </div>

        {preview && preview.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {preview.map((tag, idx) => (
              <Badge
                key={tag}
                variant="outline"
                className={`
                  text-xs font-mono animate-tag-enter
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
