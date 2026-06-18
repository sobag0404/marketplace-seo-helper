'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings2, Sparkles } from 'lucide-react';

export type ExportFormat =
  | 'default'
  | 'ozon'
  | 'wildberries'
  | 'yandex'
  | 'instagram'
  | 'tiktok'
  | 'telegram'
  | 'plaintext'
  | 'json';

interface ExportFormatSelectorProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

/**
 * Marketplace-specific hashtag limits.
 * Key = format ID, value = recommended max hashtags.
 * When the user switches format, the parent can use this to auto-adjust
 * the target hashtag count.
 */
export const FORMAT_LIMITS: Record<ExportFormat, number> = {
  default: 30,
  ozon: 15,
  wildberries: 20,
  yandex: 15,
  instagram: 30,
  tiktok: 8,
  telegram: 10,
  plaintext: 30,
  json: 30,
};

/** Emoji icons per format for visual identification */
const FORMAT_ICONS: Record<ExportFormat, string> = {
  default: '📋',
  ozon: '🟦',
  wildberries: '🟣',
  yandex: '🟡',
  instagram: '📸',
  tiktok: '🎵',
  telegram: '✈️',
  plaintext: '📝',
  json: '{}',
};

interface FormatInfo {
  id: ExportFormat;
  label: string;
  description: string;
  maxTags: number;
}

const FORMATS: FormatInfo[] = [
  { id: 'default', label: 'Стандартный', description: 'Один столбец «Хештеги» через пробел', maxTags: 30 },
  { id: 'ozon', label: 'Ozon', description: 'Через запятую, до 15 тегов (рекомендация Ozon)', maxTags: 15 },
  { id: 'wildberries', label: 'Wildberries', description: 'Через пробел, до 20 тегов (рекомендация WB)', maxTags: 20 },
  { id: 'yandex', label: 'Яндекс Маркет', description: 'Через точку с запятой, до 15 тегов', maxTags: 15 },
  { id: 'instagram', label: 'Instagram', description: 'До 30 хештегов (максимум Instagram)', maxTags: 30 },
  { id: 'tiktok', label: 'TikTok', description: 'До 8 хештегов (лучшие результаты)', maxTags: 8 },
  { id: 'telegram', label: 'Telegram', description: 'До 10 хештегов на сообщение', maxTags: 10 },
  { id: 'plaintext', label: 'Текст (по строкам)', description: 'Каждый хештег с новой строки', maxTags: 30 },
  { id: 'json', label: 'JSON массив', description: 'Массив хештегов в формате JSON', maxTags: 30 },
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
              <span className="flex items-center gap-1.5">
                <span className="text-xs">{FORMAT_ICONS[fmt.id]}</span>
                {fmt.label}
                <span className="text-muted-foreground text-[10px] ml-1">≤{fmt.maxTags}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {current?.description}
        </span>
        {current && current.maxTags < 30 && (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-3.5 border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 gap-0.5"
          >
            <Sparkles className="h-2.5 w-2.5" />
            ≤{current.maxTags} тегов
          </Badge>
        )}
      </div>
    </div>
  );
}

/** Format hashtag string based on export format */
export function formatHashtagsForExport(hashtags: string, format: ExportFormat): string {
  if (!hashtags.trim()) return '';

  const tags = hashtags.split(' ').filter(t => t.trim().length > 0);
  const limit = FORMAT_LIMITS[format];

  switch (format) {
    case 'ozon':
      // Ozon: comma-separated with # prefix
      return tags.slice(0, limit).join(', ');
    case 'wildberries':
      // WB: space-separated (default)
      return tags.slice(0, limit).join(' ');
    case 'yandex':
      // Yandex: semicolon-separated
      return tags.slice(0, limit).join('; ');
    case 'instagram':
      // Instagram: space-separated, capped at 30
      return tags.slice(0, limit).join(' ');
    case 'tiktok':
      // TikTok: space-separated, capped at 8 (TikTok best practice)
      return tags.slice(0, limit).join(' ');
    case 'telegram':
      // Telegram: space-separated (Telegram supports up to 10 hashtags per message)
      return tags.slice(0, limit).join(' ');
    case 'plaintext':
      // One tag per line — handy for manual copy/paste
      return tags.slice(0, limit).join('\n');
    case 'json':
      // JSON array of hashtags
      return JSON.stringify(tags.slice(0, limit));
    case 'default':
    default:
      return tags.slice(0, limit).join(' ');
  }
}
