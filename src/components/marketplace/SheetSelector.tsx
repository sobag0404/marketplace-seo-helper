'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Layers } from 'lucide-react';

interface SheetSelectorProps {
  sheetNames: string[];
  selectedSheet: string;
  onSheetChange: (sheet: string) => void;
}

export function SheetSelector({ sheetNames, selectedSheet, onSheetChange }: SheetSelectorProps) {
  if (sheetNames.length <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px] flex items-center gap-2">
        <Layers className="h-4 w-4 text-teal-500" />
        Лист таблицы:
      </Label>
      <Select value={selectedSheet} onValueChange={onSheetChange}>
        <SelectTrigger className="w-full sm:w-[280px]">
          <SelectValue placeholder="Выберите лист..." />
        </SelectTrigger>
        <SelectContent>
          {sheetNames.map((name, idx) => (
            <SelectItem key={name} value={name}>
              {name} {idx === 0 && '(первый)'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">
        {sheetNames.length} листов в файле
      </span>
    </div>
  );
}
