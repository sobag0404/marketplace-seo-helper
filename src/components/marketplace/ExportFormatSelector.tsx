'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

export type ExportFormat = 'default' | 'ozon' | 'wildberries' | 'yandex';

interface ExportFormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: 'default', label: 'Стандартный', description: 'Один столбец «Хештеги» с пробелами' },
  { id: 'ozon', label: 'Ozon', description: 'Хештеги через запятую с # для характеристик' },
  { id: 'wildberries', label: 'Wildberries', description: 'Хештеги через пробел, столбец «Хештеги»' },
  { id: 'yandex', label: 'Яндекс Маркет', description: 'Хештеги через точку с запятой' },
];

export function ExportFormatSelector({ value, onChange }: ExportFormatSelectorProps) {
  const current = FORMATS.find(f => f.id === value);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px] flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-teal-500" />
        Формат экспорта:
      </Label>
      <Select value={value} onValueChange={(v) => onChange(v as ExportFormat)}>
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="Выберите формат..." />
        </SelectTrigger>
        <SelectContent>
          {FORMATS.map((fmt) => (
            <SelectItem key={fmt.id} value={fmt.id}>
              {fmt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        {current?.description}
      </span>
    </div>
  );
}

/** Format hashtag string based on export format */
export function formatHashtagsForExport(hashtags: string, format: ExportFormat): string {
  if (!hashtags.trim()) return '';

  const tags = hashtags.split(' ').filter(t => t.trim().length > 0);

  switch (format) {
    case 'ozon':
      // Ozon: comma-separated with # prefix
      return tags.join(', ');
    case 'wildberries':
      // WB: space-separated (default)
      return tags.join(' ');
    case 'yandex':
      // Yandex: semicolon-separated
      return tags.join('; ');
    case 'default':
    default:
      return tags.join(' ');
  }
}
