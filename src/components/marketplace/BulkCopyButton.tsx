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
import { ClipboardList, Copy, Check, Layers, FileText, Hash } from 'lucide-react';
import { formatHashtagsForExport, type ExportFormat, FORMAT_LIMITS } from './ExportFormatSelector';
import type { TableRow } from '@/lib/marketplace/types';

type CopyMode = 'per-row' | 'all-flat' | 'first-row' | 'unique';

const MODE_LABELS: Record<CopyMode, { label: string; icon: typeof Layers; desc: string }> = {
  'per-row': { label: 'По строкам', icon: Layers, desc: 'Каждая строка отдельно (newline)' },
  'all-flat': { label: 'Все подряд', icon: Copy, desc: 'Все хештеги одной строкой через пробел' },
  'first-row': { label: 'Первая строка', icon: FileText, desc: 'Только хештеги первого товара' },
  'unique': { label: 'Уникальные', icon: Hash, desc: 'Уникальные хештеги без дубликатов' },
};

interface BulkCopyButtonProps {
  processedRows: TableRow[];
  exportFormat: ExportFormat;
  rowsWithHashtags: number;
  onToast: (title: string, description: string) => void;
}

/**
 * Dropdown button for bulk-copying hashtags with multiple modes.
 * Applies the currently selected export format to each row's hashtags.
 */
export function BulkCopyButton({
  processedRows,
  exportFormat,
  rowsWithHashtags,
  onToast,
}: BulkCopyButtonProps) {
  const [lastMode, setLastMode] = useState<CopyMode | null>(null);

  const buildText = useCallback(
    (mode: CopyMode): string => {
      const rowsWithTags = processedRows.filter((r) => r.hashtags && r.hashtags.trim());
      if (rowsWithTags.length === 0) return '';

      const formatted = rowsWithTags.map((r) =>
        formatHashtagsForExport(r.hashtags || '', exportFormat)
      );

      switch (mode) {
        case 'per-row':
          return formatted.join('\n');
        case 'all-flat': {
          // All tags joined by the format's separator (space for most)
          const allTags = formatted.flatMap((line) =>
            line.split(/[\s,;\n]+/).filter(Boolean)
          );
          return allTags.join(' ');
        }
        case 'first-row':
          return formatted[0] || '';
        case 'unique': {
          const seen = new Set<string>();
          const unique: string[] = [];
          for (const line of formatted) {
            for (const tag of line.split(/[\s,;\n]+/).filter(Boolean)) {
              const key = tag.toLowerCase();
              if (!seen.has(key)) {
                seen.add(key);
                unique.push(tag);
              }
            }
          }
          return unique.join(' ');
        }
      }
    },
    [processedRows, exportFormat]
  );

  const copyToClipboard = useCallback(
    async (text: string) => {
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
    },
    []
  );

  const handleCopy = useCallback(
    async (mode: CopyMode) => {
      const text = buildText(mode);
      if (!text) {
        onToast('Нет хештегов', 'Сначала сгенерируйте хештеги');
        return;
      }
      await copyToClipboard(text);
      setLastMode(mode);
      const tagCount = text.split(/[\s,;\n]+/).filter(Boolean).length;
      const modeLabel = MODE_LABELS[mode].label;
      onToast(
        'Скопировано в буфер',
        `${tagCount} хештегов • режим: ${modeLabel} • формат: ${exportFormat}`
      );
    },
    [buildText, copyToClipboard, onToast, exportFormat]
  );

  const disabled = rowsWithHashtags === 0;
  const limit = FORMAT_LIMITS[exportFormat];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          disabled={disabled}
          className="gap-2 flex-1 sm:flex-none hover:border-purple-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200 group"
        >
          {lastMode ? (
            <Check className="h-5 w-5 text-emerald-500 animate-in zoom-in-50 duration-300" />
          ) : (
            <ClipboardList className="h-5 w-5 group-hover:scale-110 transition-transform" />
          )}
          Копировать все
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Режим копирования
          <span className="ml-auto text-[10px] text-purple-500">формат: {exportFormat}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(MODE_LABELS) as CopyMode[]).map((mode) => {
          const { label, icon: Icon, desc } = MODE_LABELS[mode];
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => handleCopy(mode)}
              className="cursor-pointer flex-col items-start gap-0.5 py-2"
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                <span className="text-sm font-medium flex-1">{label}</span>
                {lastMode === mode && (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground pl-5.5">{desc}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          Формат «{exportFormat}»: ≤{limit} тегов на строку, применяется к каждому товару
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
