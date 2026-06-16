'use client';

import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Copy, Check } from 'lucide-react';
import type { TableRow } from '@/lib/marketplace/types';

interface HashtagCloudProps {
  processedRows: TableRow[];
}

interface HashtagEntry {
  tag: string;
  count: number;
}

type SizeTier = 'small' | 'medium' | 'large';

function getSizeTier(index: number, total: number): SizeTier {
  const ratio = index / total;
  if (ratio < 0.33) return 'large';
  if (ratio < 0.66) return 'medium';
  return 'small';
}

function getColorClasses(tier: SizeTier): string {
  switch (tier) {
    case 'large':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-800/50';
    case 'medium':
      return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-800/50';
    case 'small':
      return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-800/50';
  }
}

function getSizeClasses(tier: SizeTier): string {
  switch (tier) {
    case 'large':
      return 'text-base px-3 py-1.5';
    case 'medium':
      return 'text-sm px-2.5 py-1';
    case 'small':
      return 'text-xs px-2 py-0.5';
  }
}

export function HashtagCloud({ processedRows }: HashtagCloudProps) {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const { hashtagEntries, uniqueCount, totalRows } = useMemo(() => {
    const hashtagMap: Record<string, number> = {};
    const uniqueTags = new Set<string>();

    for (const row of processedRows) {
      if (!row.hashtags) continue;
      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      for (const tag of tags) {
        uniqueTags.add(tag);
        hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
      }
    }

    const entries: HashtagEntry[] = Object.entries(hashtagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);

    return {
      hashtagEntries: entries,
      uniqueCount: uniqueTags.size,
      totalRows: processedRows.length,
    };
  }, [processedRows]);

  const handleCopy = useCallback(async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag((prev) => (prev === tag ? null : prev)), 1200);
    } catch {
      // Fallback for environments where clipboard API is not available
      const textArea = document.createElement('textarea');
      textArea.value = tag;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag((prev) => (prev === tag ? null : prev)), 1200);
    }
  }, []);

  if (processedRows.length === 0 || hashtagEntries.length === 0) return null;

  return (
    <Card className="shadow-sm border overflow-hidden relative">
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-emerald-400 via-purple-400 to-amber-400" />
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Cloud className="h-4 w-4 text-emerald-500" />
            Облако хештегов
          </h3>
          <span className="text-xs text-muted-foreground">
            {uniqueCount} уникальных хештегов из {totalRows} строк
          </span>
        </div>

        {/* Hashtag cloud */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar pr-1">
          <div className="flex flex-wrap gap-2 justify-center">
            {hashtagEntries.map((entry, idx) => {
              const tier = getSizeTier(idx, hashtagEntries.length);
              const isCopied = copiedTag === entry.tag;

              return (
                <button
                  key={entry.tag}
                  type="button"
                  onClick={() => handleCopy(entry.tag)}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md transition-all duration-200"
                  title={`${entry.tag} — ${entry.count}×, нажмите чтобы скопировать`}
                >
                  <Badge
                    variant="outline"
                    className={`${getSizeClasses(tier)} ${getColorClasses(tier)} cursor-pointer transition-all duration-200 select-none font-medium ${
                      isCopied
                        ? 'ring-2 ring-emerald-400 scale-105 shadow-sm'
                        : ''
                    }`}
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3 mr-0.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 mr-0.5 opacity-50" />
                    )}
                    {entry.tag}
                    <span className="opacity-60 ml-0.5 tabular-nums text-[0.65em]">
                      {entry.count}
                    </span>
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            Частые
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-400" />
            Средние
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400" />
            Редкие
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
