'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, X, PencilLine, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HashtagChipsProps {
  hashtags: string;
  maxDisplay?: number;
  onRemove?: (index: number) => void;
  onEdit?: (index: number, newValue: string) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  editable?: boolean;
}

export function HashtagChips({ hashtags, maxDisplay = 15, onRemove, onEdit, onReorder, editable = false }: HashtagChipsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const tags = hashtags.split(' ').filter((t) => t.trim().length > 0);
  const displayTags = showAll ? tags : tags.slice(0, maxDisplay);
  const hasMore = tags.length > maxDisplay && !showAll;

  // Auto-focus edit input
  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIdx]);

  const handleCopy = useCallback(async (tag: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(tag);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = tag;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  }, []);

  const handleStartEdit = useCallback((idx: number) => {
    if (!editable || !onEdit) return;
    const currentTags = hashtags.split(' ').filter((t) => t.trim().length > 0);
    setEditingIdx(idx);
    setEditValue(currentTags[idx] || '');
  }, [editable, onEdit, hashtags]);

  const handleSaveEdit = useCallback(() => {
    if (editingIdx === null) return;
    let val = editValue.trim();
    if (!val.startsWith('#')) val = '#' + val;
    const currentTags = hashtags.split(' ').filter((t) => t.trim().length > 0);
    if (val.length > 1 && val !== currentTags[editingIdx]) {
      onEdit?.(editingIdx, val);
    }
    setEditingIdx(null);
    setEditValue('');
  }, [editingIdx, editValue, hashtags, onEdit]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingIdx(null);
      setEditValue('');
    }
  }, [handleSaveEdit]);

  const handleMoveUp = useCallback((idx: number) => {
    if (idx > 0 && onReorder) {
      onReorder(idx, idx - 1);
    }
  }, [onReorder]);

  const handleMoveDown = useCallback((idx: number, maxIdx: number) => {
    if (idx < maxIdx && onReorder) {
      onReorder(idx, idx + 1);
    }
  }, [onReorder]);

  if (tags.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Нет хештегов</span>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {displayTags.map((tag, idx) => {
          const tagLen = tag.length;
          const isLong = tagLen > 25;
          const isNearLimit = tagLen > 28;
          const isEditing = editingIdx === idx;

          if (isEditing) {
            return (
              <Input
                key={`edit-${idx}`}
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleEditKeyDown}
                className="h-7 w-32 text-xs px-2 py-0 border-purple-300 dark:border-purple-700 focus-visible:ring-purple-300"
              />
            );
          }

          return (
            <Badge
              key={`${tag}-${idx}`}
              variant="secondary"
              className={`
                group/tag inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium
                border transition-all duration-200 cursor-pointer animate-tag-enter
                ${isNearLimit
                  ? 'bg-gradient-to-r from-red-50/80 to-rose-50/80 text-red-700 border-red-200/80 dark:from-red-950/40 dark:to-rose-950/40 dark:text-red-300 dark:border-red-800/60 hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/50 dark:hover:to-rose-900/50'
                  : isLong
                  ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 text-amber-700 border-amber-200/80 dark:from-amber-950/40 dark:to-yellow-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:from-amber-100 hover:to-yellow-100 dark:hover:from-amber-900/50 dark:hover:to-yellow-900/50'
                  : 'bg-gradient-to-r from-purple-50/80 to-violet-50/80 text-purple-700 border-purple-200/80 dark:from-purple-950/40 dark:to-violet-950/40 dark:text-purple-300 dark:border-purple-800/60 hover:from-purple-100 hover:to-violet-100 dark:hover:from-purple-900/50 dark:hover:to-violet-900/50'
                }
                hover:scale-[1.06] hover:shadow-md hover:shadow-purple-100/50 dark:hover:shadow-purple-900/20
                active:scale-[0.96]
                ${editable ? 'pr-1' : ''}
              `}
            >
              {/* Move up/down buttons in edit mode */}
              {editable && onReorder && (
                <span className="inline-flex flex-col -ml-0.5 mr-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(idx); }}
                    className={`h-2.5 w-3.5 flex items-center justify-center rounded-sm text-[8px] transition-colors ${
                      idx === 0
                        ? 'text-muted-foreground/20 cursor-default'
                        : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                    }`}
                    disabled={idx === 0}
                    title="Переместить выше"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(idx, tags.length - 1); }}
                    className={`h-2.5 w-3.5 flex items-center justify-center rounded-sm text-[8px] transition-colors ${
                      idx === tags.length - 1
                        ? 'text-muted-foreground/20 cursor-default'
                        : 'text-purple-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                    }`}
                    disabled={idx === tags.length - 1}
                    title="Переместить ниже"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </span>
              )}
              <span
                onClick={() => handleCopy(tag, idx)}
                onDoubleClick={() => handleStartEdit(idx)}
                className="select-all"
                title={`Нажмите — копировать, 2× — редактировать (${tagLen}/30)`}
              >
                {tag}
              </span>
              {copiedIdx === idx ? (
                <Check className="h-3 w-3 text-emerald-500 shrink-0 animate-in zoom-in-50 duration-150" />
              ) : (
                <Copy
                  className="h-3 w-3 opacity-0 group-hover/tag:opacity-60 transition-opacity shrink-0"
                  onClick={() => handleCopy(tag, idx)}
                />
              )}
              {editable && onEdit && (
                <PencilLine
                  className="h-3 w-3 opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-all shrink-0 cursor-pointer text-purple-500 hover:text-purple-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(idx);
                  }}
                />
              )}
              {editable && onRemove && (
                <X
                  className="h-3 w-3 opacity-0 group-hover/tag:opacity-60 hover:!opacity-100 transition-all shrink-0 cursor-pointer text-destructive hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(idx);
                  }}
                />
              )}
            </Badge>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
        >
          Показать все {tags.length} хештегов ↓
        </button>
      )}
      {showAll && tags.length > maxDisplay && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
        >
          Свернуть ↑
        </button>
      )}
    </div>
  );
}

/** Кнопка копирования всех хештегов */
export function CopyAllButton({ hashtags }: { hashtags: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hashtags);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = hashtags;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [hashtags]);

  if (!hashtags.trim()) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopyAll}
      className="text-xs gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 shrink-0 transition-all duration-200"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 animate-in zoom-in-50 duration-150" />
          Скопировано!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Копировать все
        </>
      )}
    </Button>
  );
}
