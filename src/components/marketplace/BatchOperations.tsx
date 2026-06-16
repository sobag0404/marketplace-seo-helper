'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Minus, CheckSquare, Square, Trash2, Hash } from 'lucide-react';

interface BatchOperationsProps {
  totalRows: number;
  selectedRows: Set<number>;
  onToggleRow: (idx: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddHashtag: (hashtag: string, indices: number[]) => void;
  onRemoveHashtag: (hashtag: string, indices: number[]) => void;
  disabled?: boolean;
}

export function BatchOperations({
  totalRows,
  selectedRows,
  onToggleRow,
  onSelectAll,
  onDeselectAll,
  onAddHashtag,
  onRemoveHashtag,
  disabled,
}: BatchOperationsProps) {
  const [addTag, setAddTag] = useState('');
  const [removeTag, setRemoveTag] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const handleAdd = useCallback(() => {
    const tag = addTag.trim().startsWith('#') ? addTag.trim() : `#${addTag.trim()}`;
    if (!tag || tag === '#') return;
    onAddHashtag(tag, Array.from(selectedRows));
    setAddTag('');
    setAddOpen(false);
  }, [addTag, selectedRows, onAddHashtag]);

  const handleRemove = useCallback(() => {
    const tag = removeTag.trim().startsWith('#') ? removeTag.trim() : `#${removeTag.trim()}`;
    if (!tag || tag === '#') return;
    onRemoveHashtag(tag, Array.from(selectedRows));
    setRemoveTag('');
    setRemoveOpen(false);
  }, [removeTag, selectedRows, onRemoveHashtag]);

  if (disabled) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Row selection controls */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        >
          <CheckSquare className="h-3 w-3" />
          Все
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        >
          <Square className="h-3 w-3" />
          Снять
        </Button>
        {selectedRows.size > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800">
            {selectedRows.size} выбрано
          </Badge>
        )}
      </div>

      <div className="h-4 w-px bg-muted-foreground/15" />

      {/* Add hashtag to selected */}
      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedRows.size === 0}
            className="h-7 px-2 text-[11px] gap-1 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            <Plus className="h-3 w-3" />
            Добавить хештег
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Добавить хештег к выбранным строкам</p>
            <div className="flex gap-2">
              <Input
                value={addTag}
                onChange={(e) => setAddTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="#новый_хештег"
                className="h-8 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleAdd} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Hash className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Добавит хештег в {selectedRows.size} строк(у/и)</p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Remove hashtag from selected */}
      <Popover open={removeOpen} onOpenChange={setRemoveOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedRows.size === 0}
            className="h-7 px-2 text-[11px] gap-1 hover:border-red-300 hover:text-red-600 dark:hover:text-red-400"
          >
            <Minus className="h-3 w-3" />
            Удалить хештег
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Удалить хештег из выбранных строк</p>
            <div className="flex gap-2">
              <Input
                value={removeTag}
                onChange={(e) => setRemoveTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRemove()}
                placeholder="#хештег"
                className="h-8 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleRemove} variant="destructive" className="h-8 px-3">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Удалит хештег из {selectedRows.size} строк(и)</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
