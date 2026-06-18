'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { BarChart3, Download, Trash2, Check, FileJson } from 'lucide-react';
import { OZON_CATEGORIES } from '@/lib/marketplace/ozonCategories';
import { getCategoryGroup } from '@/lib/marketplace/categoryUtils';

interface UsageEntry {
  id: string;
  count: number;
  lastUsed: number;
}

interface UsageStatsMenuProps {
  usage: UsageEntry[];
  onClear: () => void;
  onToast: (title: string, description: string, variant?: 'default' | 'destructive') => void;
}

/**
 * Small dropdown menu for managing category usage stats:
 *  - Export usage stats to JSON (with category names resolved)
 *  - Clear all usage stats
 *
 * Useful for sellers who want to analyze their category usage patterns
 * or reset the stats after a period of use.
 */
export function UsageStatsMenu({ usage, onClear, onToast }: UsageStatsMenuProps) {
  const [lastAction, setLastAction] = useState<'export' | 'clear' | null>(null);

  const handleExport = useCallback(() => {
    if (usage.length === 0) {
      onToast('Нет данных', 'Статистика использований пуста', 'destructive');
      return;
    }

    // Resolve category names + groups for a richer export
    const exportData = {
      schema: 1,
      exportedAt: new Date().toISOString(),
      totalCategories: usage.length,
      totalUses: usage.reduce((sum, e) => sum + e.count, 0),
      categories: usage.map((entry, idx) => {
        const cat = OZON_CATEGORIES.find(c => c.id === entry.id);
        const group = cat ? getCategoryGroup(cat.id) : null;
        return {
          rank: idx + 1,
          id: entry.id,
          name: cat?.name ?? '(неизвестно)',
          group: group ? { id: group.id, name: group.name, emoji: group.emoji } : null,
          count: entry.count,
          lastUsed: new Date(entry.lastUsed).toISOString(),
        };
      }),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `msh-usage-stats-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLastAction('export');
    onToast(
      'Статистика экспортирована',
      `msh-usage-stats-${dateStr}.json • ${usage.length} категорий • ${exportData.totalUses} использований`
    );
  }, [usage, onToast]);

  const handleClear = useCallback(() => {
    if (usage.length === 0) {
      onToast('Нет данных', 'Статистика уже пуста', 'destructive');
      return;
    }
    const count = usage.length;
    onClear();
    setLastAction('clear');
    onToast(
      'Статистика очищена',
      `Удалено ${count} записей об использованных категориях`
    );
  }, [usage, onClear, onToast]);

  const totalUses = usage.reduce((sum, e) => sum + e.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-muted/60 transition-all duration-200"
          title="Управление статистикой"
        >
          {lastAction === 'clear' ? (
            <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-300" />
          ) : (
            <BarChart3 className="h-3 w-3" />
          )}
          Статистика
          {usage.length > 0 && (
            <span className="text-[9px] font-mono px-1 py-0 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 tabular-nums">
              {usage.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Статистика использований
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-[10px] text-muted-foreground space-y-0.5">
          <div className="flex justify-between">
            <span>Категорий в статистике:</span>
            <span className="font-medium text-foreground tabular-nums">{usage.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Всего использований:</span>
            <span className="font-medium text-foreground tabular-nums">{totalUses}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleExport}
          disabled={usage.length === 0}
          className="cursor-pointer flex-col items-start gap-0.5 py-2"
        >
          <div className="flex items-center gap-2 w-full">
            <Download className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium flex-1">Экспорт в JSON</span>
            <FileJson className="h-3 w-3 text-muted-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground pl-5.5">
            Категории, группы, счётчики, даты — для аналитики
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleClear}
          disabled={usage.length === 0}
          className="cursor-pointer flex-col items-start gap-0.5 py-2 text-destructive focus:text-destructive"
        >
          <div className="flex items-center gap-2 w-full">
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm font-medium flex-1">Очистить статистику</span>
          </div>
          <span className="text-[10px] text-muted-foreground pl-5.5">
            Удалить все записи об использованных категориях
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          Статистика хранится в браузере (localStorage) и не передаётся на сервер
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
