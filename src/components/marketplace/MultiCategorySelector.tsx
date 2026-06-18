'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Layers, Plus, X, Search, Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { SEMANTIC_GROUPS } from '@/lib/marketplace/semanticGroups';
import { searchCategories, getCategoryGroup } from '@/lib/marketplace/categoryUtils';

interface MultiCategorySelectorProps {
  /** Secondary categories selected (in addition to the primary one) */
  selectedCategoryIds: string[];
  /** Callback when the selection changes */
  onChange: (ids: string[]) => void;
  /** Maximum number of secondary categories allowed */
  maxSecondary?: number;
}

/**
 * Multi-category selector: lets the user pick 1-3 SECONDARY Ozon categories
 * whose hashtags will be merged with the primary category's hashtags.
 *
 * Use case: sellers with mixed product catalogs (e.g. a store selling both
 * «Пледы и покрывала» and «Постельное белье») want hashtags from both
 * categories to appear for each product.
 *
 * The primary category is selected via the main CategorySelector; this
 * component only handles the secondary (additive) categories.
 */
export function MultiCategorySelector({
  selectedCategoryIds,
  onChange,
  maxSecondary = 3,
}: MultiCategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCategories = useMemo(
    () => selectedCategoryIds
      .map(id => OZON_CATEGORIES.find(c => c.id === id))
      .filter((c): c is OzonCategory => c !== undefined),
    [selectedCategoryIds]
  );

  const groupedCategories = useMemo(() => {
    let cats: OzonCategory[];
    if (searchQuery.trim()) {
      cats = searchCategories(searchQuery);
    } else {
      cats = OZON_CATEGORIES;
    }
    const groups: Record<string, { group: typeof SEMANTIC_GROUPS[number]; categories: OzonCategory[] }> = {};
    for (const cat of cats) {
      if (!groups[cat.semanticGroup]) {
        const group = SEMANTIC_GROUPS.find(g => g.id === cat.semanticGroup);
        groups[cat.semanticGroup] = {
          group: group ?? { id: cat.semanticGroup, name: cat.semanticGroup, emoji: '📦', baseHashtags: [] },
          categories: [],
        };
      }
      groups[cat.semanticGroup].categories.push(cat);
    }
    return Object.values(groups).sort((a, b) => b.categories.length - a.categories.length);
  }, [searchQuery]);

  const handleToggle = useCallback((categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      // Remove
      onChange(selectedCategoryIds.filter(id => id !== categoryId));
    } else {
      // Add (respect max)
      if (selectedCategoryIds.length >= maxSecondary) return;
      onChange([...selectedCategoryIds, categoryId]);
    }
  }, [selectedCategoryIds, onChange, maxSecondary]);

  const handleRemove = useCallback((categoryId: string) => {
    onChange(selectedCategoryIds.filter(id => id !== categoryId));
  }, [selectedCategoryIds, onChange]);

  const isMaxReached = selectedCategoryIds.length >= maxSecondary;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-violet-500" />
          Доп. категории:
          <span className="text-[10px] text-muted-foreground font-normal">
            (хештеги объединяются)
          </span>
        </span>
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearchQuery(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isMaxReached}
              className="h-7 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" />
              {isMaxReached ? `Макс. ${maxSecondary}` : 'Добавить'}
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[460px] p-0" align="start">
            <Command shouldFilter={false} className="rounded-lg">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Поиск по 614 категориям Ozon..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="border-0 focus:ring-0 h-9"
                />
              </div>
              <CommandList className="max-h-[320px]">
                <CommandEmpty>
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Категория не найдена
                  </div>
                </CommandEmpty>
                {groupedCategories.map(({ group, categories }) => (
                  <CommandGroup
                    key={group.id}
                    heading={
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span>{group.emoji}</span>
                        {group.name}
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border-violet-200/60">
                          {categories.length}
                        </Badge>
                      </span>
                    }
                  >
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <CommandItem
                          key={cat.id}
                          value={cat.id + ' ' + cat.name + ' ' + cat.productTypes.slice(0, 5).join(' ')}
                          onSelect={() => handleToggle(cat.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 shrink-0 ${isSelected ? 'opacity-100 text-violet-600' : 'opacity-0'}`}
                          />
                          <span className="truncate flex-1">{cat.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                            {cat.productTypes.length} тип.
                          </span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
              <div className="border-t px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Выбрано: {selectedCategoryIds.length} / {maxSecondary}
                </span>
                {searchQuery && (
                  <span className="text-[10px] text-violet-600">
                    Найдено: {searchCategories(searchQuery).length}
                  </span>
                )}
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected secondary categories chips */}
      {selectedCategories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedCategories.map((cat) => {
            const group = getCategoryGroup(cat.id);
            return (
              <Badge
                key={cat.id}
                variant="outline"
                className="gap-1 px-2 py-0.5 text-xs border-violet-300 bg-violet-50/70 text-violet-800 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300 group/chip"
              >
                <Sparkles className="h-2.5 w-2.5 text-violet-500" />
                <span>{group?.emoji ?? '📦'}</span>
                <span className="truncate max-w-[120px]">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(cat.id)}
                  className="ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-violet-200/60 dark:hover:bg-violet-800/40 transition-colors p-0.5"
                  aria-label="Убрать категорию"
                  title="Убрать категорию"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {selectedCategories.length === 0 && (
        <p className="text-[10px] text-muted-foreground/70 italic pl-1">
          Хештеги из доп. категорий будут добавлены к хештегам основной категории
        </p>
      )}
    </div>
  );
}
