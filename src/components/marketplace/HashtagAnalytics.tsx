'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Hash, Type, Languages, Ruler } from 'lucide-react';
import type { TableRow } from '@/lib/marketplace/types';
import {
  analyzeHashtags,
  LENGTH_BUCKET_LABELS,
  type LengthBucket,
} from '@/lib/marketplace/hashtagGenerator';

interface HashtagAnalyticsProps {
  processedRows: TableRow[];
  nameColumn: string;
}

interface TopHashtag {
  tag: string;
  count: number;
}

export function HashtagAnalytics({ processedRows }: HashtagAnalyticsProps) {
  const { analysis, topHashtags, avgPerRow, rowsWithTags } = useMemo(() => {
    const hashtagMap: Record<string, number> = {};
    let totalTags = 0;
    let rowsWith = 0;
    const allTags: string[] = [];
    const uniqueTags = new Set<string>();

    for (const row of processedRows) {
      if (!row.hashtags) continue;
      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      if (tags.length > 0) {
        rowsWith++;
        totalTags += tags.length;
        tags.forEach((tag) => {
          allTags.push(tag);
          uniqueTags.add(tag.toLowerCase());
          hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
        });
      }
    }

    const topHashtags: TopHashtag[] = Object.entries(hashtagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      analysis: analyzeHashtags(allTags),
      topHashtags,
      avgPerRow: rowsWith > 0 ? (totalTags / rowsWith).toFixed(1) : '0',
      rowsWithTags: rowsWith,
    };
  }, [processedRows]);

  const maxHashtagCount = topHashtags.length > 0 ? topHashtags[0].count : 1;

  if (processedRows.length === 0 || analysis.total === 0) return null;

  // Language distribution
  const langTotal = analysis.russian + analysis.english + analysis.numeric || 1;
  const langStats = [
    { id: 'russian', label: 'Русские', count: analysis.russian, color: 'bg-emerald-500' },
    { id: 'english', label: 'Английские', count: analysis.english, color: 'bg-purple-500' },
    { id: 'numeric', label: 'Цифровые', count: analysis.numeric, color: 'bg-amber-500' },
  ];

  // Length distribution
  const lengthStats: { id: LengthBucket; label: string; count: number }[] = (
    ['short', 'medium', 'long', 'xlong'] as LengthBucket[]
  )
    .map((id) => ({
      id,
      label: LENGTH_BUCKET_LABELS[id],
      count: analysis.byLength[id],
    }))
    .filter((s) => s.count > 0);

  const maxLenCount = lengthStats.length > 0 ? Math.max(...lengthStats.map((s) => s.count)) : 1;

  return (
    <Card className="shadow-sm border overflow-hidden relative card-shine">
      {/* Gradient top border */}
      <div className="h-1.5 bg-gradient-to-r from-purple-400 via-rose-400 to-amber-400" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Аналитика хештегов
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400">
              <Hash className="h-3 w-3 mr-0.5" />
              {analysis.unique} уникальных
            </Badge>
            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              ~{avgPerRow}/строку
            </Badge>
            <Badge variant="outline" className="text-[10px] border-teal-200 text-teal-600 dark:border-teal-800 dark:text-teal-400">
              <Type className="h-3 w-3 mr-0.5" />
              {rowsWithTags} строк с тегами
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Language distribution */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Languages className="h-3 w-3" />
              Язык хештегов
            </p>
            <div className="space-y-2">
              {langStats.map((stat) => (
                <div key={stat.id} className="flex items-center gap-2 group">
                  <span className="text-[11px] font-medium text-foreground w-20 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {stat.label}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${stat.color}`}
                      style={{ width: `${Math.max((stat.count / langTotal) * 100, 3)}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium text-foreground/70 tabular-nums">
                      {stat.count} ({Math.round((stat.count / langTotal) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Length distribution */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Ruler className="h-3 w-3" />
              Длина хештегов
            </p>
            <div className="space-y-2">
              {lengthStats.map((stat) => (
                <div key={stat.id} className="flex items-center gap-2 group">
                  <span className="text-[11px] font-medium text-foreground w-28 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {stat.label}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-700 ease-out"
                      style={{ width: `${Math.max((stat.count / maxLenCount) * 100, 3)}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium text-foreground/70 tabular-nums">
                      {stat.count}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground pt-1">
                Средняя длина: <span className="font-medium text-foreground">{analysis.avgLength}</span> симв.
              </p>
            </div>
          </div>

          {/* Top Hashtags */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              Топ-15 хештегов
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
              {topHashtags.map((ht) => (
                <div key={ht.tag} className="flex items-center gap-2 group">
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 w-28 truncate group-hover:text-purple-500 transition-colors" title={ht.tag}>
                    {ht.tag}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-rose-400 transition-all duration-700 ease-out"
                      style={{ width: `${Math.max((ht.count / maxHashtagCount) * 100, 3)}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium text-foreground/70 tabular-nums">
                      {ht.count}×
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
