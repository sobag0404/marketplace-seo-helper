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
import {
  FileDown, FileText, Hash, ListOrdered, Braces, Check,
} from 'lucide-react';
import { formatHashtagsForExport, type ExportFormat, FORMAT_LIMITS } from './ExportFormatSelector';
import type { TableRow } from '@/lib/marketplace/types';

/** File format for hashtags-only download */
type TxtFormat = 'txt-per-line' | 'txt-flat' | 'txt-unique' | 'json-array' | 'csv-tags';

const TXT_FORMATS: Record<TxtFormat, { label: string; icon: typeof Hash; desc: string; ext: string }> = {
  'txt-per-line': { label: 'TXT построчно', icon: ListOrdered, desc: 'Каждый товар — отдельная строка с тегами', ext: 'txt' },
  'txt-flat':     { label: 'TXT сплошной',  icon: Hash,        desc: 'Все теги одной строкой через пробел',     ext: 'txt' },
  'txt-unique':   { label: 'TXT уникальные', icon: Hash,        desc: 'Уникальные теги без дубликатов',          ext: 'txt' },
  'json-array':   { label: 'JSON массив',   icon: Braces,      desc: 'Массив всех тегов в формате JSON',        ext: 'json' },
  'csv-tags':     { label: 'CSV (1 колонка)', icon: FileText,  desc: 'Один тег на строку, для импорта',         ext: 'csv' },
};

interface HashtagsOnlyExportProps {
  processedRows: TableRow[];
  exportFormat: ExportFormat;
  rowsWithHashtags: number;
  baseFileName: string;
  onToast: (title: string, description: string) => void;
}

/**
 * Скачать только хештеги (без исходных колонок) — для соцсетей, постов, импорта.
 * Применяет выбранный формат экспорта к каждой строке.
 */
export function HashtagsOnlyExport({
  processedRows,
  exportFormat,
  rowsWithHashtags,
  baseFileName,
  onToast,
}: HashtagsOnlyExportProps) {
  const [lastFormat, setLastFormat] = useState<TxtFormat | null>(null);

  const buildContent = useCallback(
    (fmt: TxtFormat): { text: string; mime: string; ext: string } => {
      const rowsWithTags = processedRows.filter((r) => r.hashtags && r.hashtags.trim());
      const formatted = rowsWithTags.map((r) =>
        formatHashtagsForExport(r.hashtags || '', exportFormat)
      );

      switch (fmt) {
        case 'txt-per-line': {
          // Each product on its own line; tags joined by export-format separator
          return { text: formatted.join('\n'), mime: 'text/plain;charset=utf-8', ext: 'txt' };
        }
        case 'txt-flat': {
          // All tags in one giant line, space-separated
          const all = formatted
            .flatMap((line) => line.split(/[\s,;\n]+/).filter(Boolean))
            .join(' ');
          return { text: all, mime: 'text/plain;charset=utf-8', ext: 'txt' };
        }
        case 'txt-unique': {
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
          return { text: unique.join(' '), mime: 'text/plain;charset=utf-8', ext: 'txt' };
        }
        case 'json-array': {
          const all: string[] = [];
          for (const line of formatted) {
            for (const tag of line.split(/[\s,;\n]+/).filter(Boolean)) {
              all.push(tag);
            }
          }
          return {
            text: JSON.stringify(all, null, 2),
            mime: 'application/json;charset=utf-8',
            ext: 'json',
          };
        }
        case 'csv-tags': {
          // Single-column CSV (one tag per line) — handy for marketplace bulk imports
          const all: string[] = [];
          for (const line of formatted) {
            for (const tag of line.split(/[\s,;\n]+/).filter(Boolean)) {
              all.push(tag);
            }
          }
          const seen = new Set<string>();
          const unique: string[] = [];
          for (const tag of all) {
            const key = tag.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(tag);
            }
          }
          return {
            text: ['hashtag', ...unique].join('\n'),
            mime: 'text/csv;charset=utf-8',
            ext: 'csv',
          };
        }
      }
    },
    [processedRows, exportFormat]
  );

  const handleDownload = useCallback(
    (fmt: TxtFormat) => {
      const { text, mime, ext } = buildContent(fmt);
      if (!text.trim()) {
        onToast('Нет хештегов', 'Сначала сгенерируйте хештеги');
        return;
      }

      const blob = new Blob([text], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseFileName}_hashtags.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastFormat(fmt);
      const tagCount = text.split(/[\s,;\n]+/).filter(Boolean).length;
      const fmtInfo = TXT_FORMATS[fmt];
      onToast(
        `Файл скачан`,
        `${baseFileName}_hashtags.${ext} • ${tagCount} тегов • ${fmtInfo.label}`
      );
    },
    [buildContent, baseFileName, onToast]
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
          className="gap-2 flex-1 sm:flex-none hover:border-amber-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all duration-200 group"
        >
          {lastFormat ? (
            <Check className="h-5 w-5 text-emerald-500 animate-in zoom-in-50 duration-300" />
          ) : (
            <FileDown className="h-5 w-5 group-hover:scale-110 transition-transform" />
          )}
          Только хештеги
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
          <FileDown className="h-3.5 w-3.5" />
          Скачать только хештеги
          <span className="ml-auto text-[10px] text-amber-500">формат: {exportFormat}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(Object.keys(TXT_FORMATS) as TxtFormat[]).map((fmt) => {
          const { label, icon: Icon, desc } = TXT_FORMATS[fmt];
          return (
            <DropdownMenuItem
              key={fmt}
              onClick={() => handleDownload(fmt)}
              className="cursor-pointer flex-col items-start gap-0.5 py-2"
            >
              <div className="flex items-center gap-2 w-full">
                <Icon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-sm font-medium flex-1">{label}</span>
                {lastFormat === fmt && (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground pl-5.5">{desc}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
          Формат «{exportFormat}»: ≤{limit} тегов на товар, без исходных колонок
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
