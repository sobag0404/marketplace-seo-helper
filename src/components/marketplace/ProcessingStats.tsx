'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Hash,
  SkipForward,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ProcessingStats as Stats } from '@/lib/marketplace/types';

interface ProcessingStatsProps {
  stats: Stats;
}

export function ProcessingStats({ stats }: ProcessingStatsProps) {
  const successRate = stats.totalRows > 0
    ? Math.round((stats.rowsWithHashtags / stats.totalRows) * 100)
    : 0;

  const items = [
    {
      icon: FileText,
      label: 'Всего строк',
      value: stats.totalRows,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50/80 dark:bg-sky-950/30',
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      borderGradient: 'from-sky-400/30 to-sky-500/10',
    },
    {
      icon: CheckCircle2,
      label: 'Обработано',
      value: stats.processedRows,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      borderGradient: 'from-emerald-400/30 to-emerald-500/10',
    },
    {
      icon: Hash,
      label: 'С хештегами',
      value: stats.rowsWithHashtags,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50/80 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      borderGradient: 'from-purple-400/30 to-purple-500/10',
    },
    {
      icon: SkipForward,
      label: 'Пропущено',
      value: stats.skippedRows,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/80 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      borderGradient: 'from-amber-400/30 to-amber-500/10',
    },
    {
      icon: AlertTriangle,
      label: 'Ошибки',
      value: stats.errors,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50/80 dark:bg-red-950/30',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      borderGradient: 'from-red-400/30 to-red-500/10',
    },
  ];

  return (
    <Card className="shadow-sm border overflow-hidden relative card-shine">
      {/* Subtle gradient border effect at top */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Title + progress */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Статистика обработки
            </h3>
            <span className="text-2xl font-extrabold tabular-nums animate-count-up" style={{ color: successRate >= 80 ? '#22c55e' : successRate >= 50 ? '#f59e0b' : '#ef4444' }}>
              {successRate}%
            </span>
          </div>
          <div className="relative">
            <Progress value={successRate} className="h-3" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.rowsWithHashtags} из {stats.totalRows} строк получили хештеги
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {items.map((item) => (
            <div
              key={item.label}
              className={`${item.bg} rounded-xl p-3 flex flex-col items-center text-center border border-white/50 dark:border-white/5 transition-all duration-200 hover:scale-[1.05] hover:shadow-lg relative overflow-hidden backdrop-blur-sm`}
            >
              {/* Gradient border effect */}
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${item.borderGradient}`} />
              <div className={`${item.iconBg} h-8 w-8 rounded-lg flex items-center justify-center mb-1.5 shadow-sm`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <span className={`text-xl font-bold ${item.color} tabular-nums animate-count-up`}>
                {item.value}
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error messages */}
        {stats.errorMessages.length > 0 && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ошибки при обработке:
            </p>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
              {stats.errorMessages.map((msg, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {msg}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
