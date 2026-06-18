'use client';

import { useState, useCallback, useRef } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { HashtagChips, CopyAllButton } from './HashtagChips';
import { HashtagQualityScore } from './HashtagQualityScore';
import { QuickSuggestions } from './QuickSuggestions';

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string | number | null>[];
  nameColumn: string;
  hashtagColumn?: string;
  maxRows?: number;
  /** When editable, shows edit/delete buttons for hashtags */
  editable?: boolean;
  /** Callback when a hashtag is removed from a row */
  onRemoveHashtag?: (rowIndex: number, tagIndex: number) => void;
  /** Callback when a hashtag is edited in a row */
  onEditHashtag?: (rowIndex: number, tagIndex: number, newValue: string) => void;
  /** Callback when a new hashtag is added to a row */
  onAddHashtag?: (rowIndex: number, newTag: string) => void;
  /** Callback when hashtags are reordered in a row */
  onReorderHashtag?: (rowIndex: number, fromIndex: number, toIndex: number) => void;
  /** The original processed rows for index tracking */
  processedRowIndices?: number[];
  /** Whether rows can be selected for batch operations */
  selectable?: boolean;
  /** Set of selected row indices */
  selectedRows?: Set<number>;
  /** Toggle row selection */
  onToggleRow?: (idx: number) => void;
  /** Selected Ozon category ID — for quick suggestions */
  categoryId?: string;
  /** Product type within the category */
  productType?: string;
  /** Custom keywords from the user */
  customKeywords?: string[];
  /** Whether to show quick suggestions */
  showSuggestions?: boolean;
  /** Target hashtag count for display */
  targetHashtagCount?: number;
}

export function PreviewTable({
  headers,
  rows,
  nameColumn,
  hashtagColumn,
  maxRows = 10,
  editable = false,
  onRemoveHashtag,
  onEditHashtag,
  onAddHashtag,
  onReorderHashtag,
  processedRowIndices,
  selectable = false,
  selectedRows,
  onToggleRow,
  categoryId,
  productType,
  customKeywords,
  showSuggestions = false,
  targetHashtagCount = 30,
}: PreviewTableProps) {
  const displayRows = rows.slice(0, maxRows);
  const displayHeaders = hashtagColumn
    ? [...headers, hashtagColumn]
    : headers;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Предпросмотр: {Math.min(maxRows, rows.length)} из {rows.length} строк
        </p>
        <div className="flex items-center gap-2">
          {editable && (
            <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20">
              ✏️ Редактирование
            </Badge>
          )}
          {selectable && selectedRows && selectedRows.size > 0 && (
            <Badge variant="outline" className="text-xs border-teal-300 text-teal-600 dark:border-teal-700 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">
              ✓ {selectedRows.size} выбрано
            </Badge>
          )}
          {rows.length > maxRows && (
            <Badge variant="outline" className="text-xs">
              +{rows.length - maxRows} строк скрыто
            </Badge>
          )}
        </div>
      </div>

      {/* Desktop: Table layout (hidden on mobile) */}
      <div className="hidden sm:block rounded-xl border bg-card overflow-hidden shadow-sm">
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  {selectable && (
                    <TableHead className="w-10 text-xs">✓</TableHead>
                  )}
                  {displayHeaders.map((header, idx) => (
                    <TableHead
                      key={idx}
                      className={`text-xs whitespace-nowrap ${
                        header === nameColumn
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 font-semibold text-emerald-700 dark:text-emerald-300'
                          : header === hashtagColumn
                          ? 'bg-purple-50/80 dark:bg-purple-950/40 font-semibold text-purple-700 dark:text-purple-300'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {header}
                        {header === nameColumn && (
                          <span className="text-emerald-500">●</span>
                        )}
                        {header === hashtagColumn && (
                          <span className="text-purple-500">#</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRows.map((row, rowIdx) => {
                  const actualRowIdx = processedRowIndices ? processedRowIndices[rowIdx] : rowIdx;
                  const isSelected = selectable && selectedRows?.has(actualRowIdx);
                  const hashtagStr = hashtagColumn ? (row[hashtagColumn] != null ? String(row[hashtagColumn]) : '') : '';
                  const hashtagCount = hashtagStr ? hashtagStr.split(' ').filter((t: string) => t.trim().length > 0).length : 0;

                  return (
                    <TableRow
                      key={rowIdx}
                      className={`
                        group transition-all duration-200
                        ${editable
                          ? 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20 border-l-2 border-l-purple-400 dark:border-l-purple-600'
                          : isSelected
                          ? 'bg-teal-50/40 dark:bg-teal-950/15 hover:bg-teal-50/60 dark:hover:bg-teal-950/25 border-l-2 border-l-teal-400 dark:border-l-teal-600'
                          : 'hover:bg-muted/20'
                        }
                      `}
                    >
                      {selectable && (
                        <TableCell className="w-10 py-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleRow?.(actualRowIdx)}
                            className="transition-all duration-200 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                          />
                        </TableCell>
                      )}
                      {displayHeaders.map((header, colIdx) => {
                        const value = row[header];
                        const isNameCol = header === nameColumn;
                        const isHashtagCol = header === hashtagColumn;

                        if (isHashtagCol) {
                          return (
                            <TableCell
                              key={colIdx}
                              className={`text-xs align-top py-2 ${editable ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''}`}
                            >
                              <div className="flex items-start gap-1">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <HashtagQualityScore hashtags={hashtagStr} />
                                  </div>
                                  <HashtagChips
                                    hashtags={hashtagStr}
                                    maxDisplay={5}
                                    editable={editable}
                                    onRemove={onRemoveHashtag ? (tagIdx) => {
                                      onRemoveHashtag(actualRowIdx, tagIdx);
                                    } : undefined}
                                    onEdit={onEditHashtag ? (tagIdx, newValue) => {
                                      onEditHashtag(actualRowIdx, tagIdx, newValue);
                                    } : undefined}
                                    onReorder={onReorderHashtag ? (fromIdx, toIdx) => {
                                      onReorderHashtag(actualRowIdx, fromIdx, toIdx);
                                    } : undefined}
                                  />
                                  {hashtagCount > 0 && (
                                    <p className={`text-[10px] ${
                                      hashtagCount >= 30
                                        ? 'text-red-500 font-semibold'
                                        : hashtagCount >= targetHashtagCount
                                        ? 'text-emerald-500 font-medium'
                                        : hashtagCount >= 25
                                        ? 'text-amber-500 font-medium'
                                        : 'text-muted-foreground/70'
                                    }`}>
                                      {hashtagCount}/{targetHashtagCount} хештегов
                                    </p>
                                  )}
                                  {editable && onAddHashtag && (
                                    <InlineAddHashtag
                                      onAdd={(tag) => onAddHashtag(actualRowIdx, tag)}
                                      disabled={hashtagCount >= 30}
                                    />
                                  )}
                                  {showSuggestions && categoryId && onAddHashtag && (
                                    <QuickSuggestions
                                      currentHashtags={hashtagStr}
                                      categoryId={categoryId}
                                      productType={productType}
                                      customKeywords={customKeywords}
                                      productName={nameColumn ? String(row[nameColumn] || '') : ''}
                                      onAddSuggestion={(tag) => onAddHashtag(actualRowIdx, tag)}
                                      disabled={hashtagCount >= 30}
                                    />
                                  )}
                                </div>
                                <CopyAllButton hashtags={hashtagStr} />
                              </div>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={colIdx}
                            className={`text-xs max-w-[250px] ${
                              isNameCol
                                ? 'font-medium text-emerald-700 dark:text-emerald-300'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <span className="truncate block">
                              {value != null ? String(value) : ''}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Mobile: Card layout (hidden on desktop) */}
      <div className="sm:hidden space-y-2">
        {displayRows.map((row, rowIdx) => {
          const actualRowIdx = processedRowIndices ? processedRowIndices[rowIdx] : rowIdx;
          const isSelected = selectable && selectedRows?.has(actualRowIdx);
          const hashtagStr = hashtagColumn ? (row[hashtagColumn] != null ? String(row[hashtagColumn]) : '') : '';
          const hashtagCount = hashtagStr ? hashtagStr.split(' ').filter((t: string) => t.trim().length > 0).length : 0;
          const nameValue = nameColumn ? (row[nameColumn] != null ? String(row[nameColumn]) : '') : '';
          const otherHeaders = headers.filter(h => h !== nameColumn && h !== hashtagColumn);

          return (
            <Card
              key={rowIdx}
              className={`
                shadow-sm transition-all duration-200 overflow-hidden
                ${editable
                  ? 'border-purple-200 dark:border-purple-800 ring-1 ring-purple-100 dark:ring-purple-900/50'
                  : isSelected
                  ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10'
                  : 'border'
                }
              `}
            >
              <CardContent className="p-3 space-y-2">
                {/* Header row with name + checkbox */}
                <div className="flex items-start gap-2">
                  {selectable && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleRow?.(actualRowIdx)}
                      className="mt-0.5 transition-all duration-200 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">
                      {nameValue || '—'}
                    </p>
                  </div>
                </div>
                {/* Other data fields */}
                {otherHeaders.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {otherHeaders.slice(0, 3).map((header) => {
                      const val = row[header];
                      return val != null && String(val).trim() ? (
                        <div key={header} className="text-[11px]">
                          <span className="text-muted-foreground">{header}: </span>
                          <span className="text-foreground font-medium truncate max-w-[120px] inline-block align-bottom">{String(val)}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                {/* Hashtags */}
                {hashtagColumn && (
                  <div className="space-y-1">
                    <div className="flex items-start gap-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <HashtagQualityScore hashtags={hashtagStr} />
                        </div>
                        <HashtagChips
                          hashtags={hashtagStr}
                          maxDisplay={3}
                          editable={editable}
                          onRemove={onRemoveHashtag ? (tagIdx) => {
                            onRemoveHashtag(actualRowIdx, tagIdx);
                          } : undefined}
                          onEdit={onEditHashtag ? (tagIdx, newValue) => {
                            onEditHashtag(actualRowIdx, tagIdx, newValue);
                          } : undefined}
                          onReorder={onReorderHashtag ? (fromIdx, toIdx) => {
                            onReorderHashtag(actualRowIdx, fromIdx, toIdx);
                          } : undefined}
                        />
                      </div>
                      <CopyAllButton hashtags={hashtagStr} />
                    </div>
                    {hashtagCount > 0 && (
                      <p className={`text-[10px] ${
                        hashtagCount >= 30
                          ? 'text-red-500 font-semibold'
                          : hashtagCount >= targetHashtagCount
                          ? 'text-emerald-500 font-medium'
                          : hashtagCount >= 25
                          ? 'text-amber-500 font-medium'
                          : 'text-muted-foreground/70'
                      }`}>
                        {hashtagCount}/{targetHashtagCount} хештегов
                      </p>
                    )}
                    {editable && onAddHashtag && (
                      <InlineAddHashtag
                        onAdd={(tag) => onAddHashtag(actualRowIdx, tag)}
                        disabled={hashtagCount >= 30}
                      />
                    )}
                    {showSuggestions && categoryId && onAddHashtag && (
                      <QuickSuggestions
                        currentHashtags={hashtagStr}
                        categoryId={categoryId}
                        productType={productType}
                        customKeywords={customKeywords}
                        productName={nameValue || ''}
                        onAddSuggestion={(tag) => onAddHashtag(actualRowIdx, tag)}
                        disabled={hashtagCount >= 30}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Inline component for adding a hashtag to a row in edit mode */
function InlineAddHashtag({ onAdd, disabled }: { onAdd: (tag: string) => void; disabled: boolean }) {
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const tag = value.trim();
    if (tag.length > 1) {
      onAdd(tag);
      setValue('');
    }
    setIsAdding(false);
  }, [value, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setValue('');
    }
  }, [handleSubmit]);

  if (isAdding) {
    return (
      <div className="flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder="#новый_хештег"
          className="h-6 w-36 text-[11px] px-2 py-0 border-purple-300 dark:border-purple-700 focus-visible:ring-purple-300"
          autoFocus
        />
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => { setIsAdding(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      disabled={disabled}
      className="h-5 px-1.5 text-[10px] gap-0.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-200 mt-0.5"
    >
      <Plus className="h-2.5 w-2.5" />
      Добавить
    </Button>
  );
}
