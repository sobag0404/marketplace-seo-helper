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
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ColumnSelectorProps {
  headers: string[];
  selectedColumn: string;
  onColumnChange: (column: string) => void;
  detectedColumn: number | null;
  label: string;
  type: 'name' | 'article';
}

export function ColumnSelector({
  headers,
  selectedColumn,
  onColumnChange,
  detectedColumn,
  label,
  type,
}: ColumnSelectorProps) {
  const isAutoDetected =
    detectedColumn !== null && headers[detectedColumn] === selectedColumn;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px] flex items-center gap-2">
        {label}
        {isAutoDetected ? (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Авто
          </Badge>
        ) : type === 'name' && !isAutoDetected && selectedColumn ? (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            Вручную
          </Badge>
        ) : null}
      </Label>
      <Select value={selectedColumn} onValueChange={onColumnChange}>
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="Выберите столбец..." />
        </SelectTrigger>
        <SelectContent>
          {headers.map((header, idx) => (
            <SelectItem key={idx} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
