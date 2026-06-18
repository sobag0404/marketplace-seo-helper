'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search, Layers, Tag, Star } from 'lucide-react';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { SEMANTIC_GROUPS, SemanticGroup } from '@/lib/marketplace/semanticGroups';
import { searchCategories } from '@/lib/marketplace/categoryUtils';

interface CategorySelectorProps {
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null, category: OzonCategory | null) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function CategorySelector({
  selectedCategoryId,
  onCategoryChange,
  isFavorite,
  onToggleFavorite,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find selected category
  const selectedCategory = useMemo(
    () => selectedCategoryId ? OZON_CATEGORIES.find(c => c.id === selectedCategoryId) : null,
    [selectedCategoryId]
  );

  // Group categories by semantic group
  const groupedCategories = useMemo(() => {
    let cats: OzonCategory[];

    if (searchQuery.trim()) {
      cats = searchCategories(searchQuery);
    } else {
      cats = OZON_CATEGORIES;
    }

    const groups: Record<string, { group: SemanticGroup; categories: OzonCategory[] }> = {};

    for (const cat of cats) {
      if (!groups[cat.semanticGroup]) {
        const group = SEMANTIC_GROUPS.find(g => g.id === cat.semanticGroup);
        groups[cat.semanticGroup] = {
          group: group ?? { id: cat.semanticGroup, name: cat.semanticGroup, emoji: '📦', baseHashtags: [] },
          categories: []
        };
      }
      groups[cat.semanticGroup].categories.push(cat);
    }

    // Sort groups by number of categories (most first)
    return Object.values(groups).sort((a, b) => b.categories.length - a.categories.length);
  }, [searchQuery]);

  const handleSelect = useCallback((categoryId: string) => {
    const cat = OZON_CATEGORIES.find(c => c.id === categoryId);
    onCategoryChange(categoryId, cat ?? null);
    setOpen(false);
    setSearchQuery('');
  }, [onCategoryChange]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px] flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-emerald-600" />
        Категория Ozon:
      </Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearchQuery(''); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[400px] justify-between text-left font-normal h-10"
          >
            {selectedCategory ? (
              <span className="truncate flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-emerald-500 shrink-0" />
                {selectedCategory.name}
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({selectedCategory.productTypes.length})
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Выберите категорию...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0" align="start">
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
            <CommandList className="max-h-[360px]">
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
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/60">
                        {categories.length}
                      </Badge>
                    </span>
                  }
                >
                  {categories.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      value={cat.id + ' ' + cat.name + ' ' + cat.productTypes.slice(0, 5).join(' ')}
                      onSelect={() => handleSelect(cat.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 shrink-0 ${selectedCategoryId === cat.id ? 'opacity-100 text-emerald-600' : 'opacity-0'}`}
                      />
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1 shrink-0">
                        {cat.productTypes.length} тип.
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="border-t px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                614 категорий • {OZON_CATEGORIES.reduce((s, c) => s + c.productTypes.length, 0).toLocaleString()} типов товаров
              </span>
              {searchQuery && (
                <span className="text-[10px] text-emerald-600">
                  Найдено: {searchCategories(searchQuery).length}
                </span>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedCategory && (
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(selectedCategory.id)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 group"
              aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            >
              <Star
                className={`h-4 w-4 transition-all duration-200 ${
                  isFavorite
                    ? 'fill-amber-400 text-amber-400 group-hover:scale-110'
                    : 'text-muted-foreground/50 group-hover:text-amber-400 group-hover:fill-amber-200/50'
                }`}
              />
            </button>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline max-w-[200px] truncate">
            {selectedCategory.productTypes.slice(0, 3).join(', ')}...
          </span>
        </div>
      )}
    </div>
  );
}
