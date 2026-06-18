'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Check, ChevronsUpDown, Search, Boxes, X } from 'lucide-react';
import type { OzonCategory } from '@/lib/marketplace/ozonCategories';

interface ProductTypeSelectorProps {
  /** Selected Ozon category — product types come from this */
  category: OzonCategory | null;
  /** Currently selected product type (or null for "all") */
  selectedProductType: string | null;
  onChange: (productType: string | null) => void;
}

export function ProductTypeSelector({
  category,
  selectedProductType,
  onChange,
}: ProductTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTypes = useMemo(() => {
    if (!category) return [];
    if (!searchQuery.trim()) return category.productTypes;
    const q = searchQuery.toLowerCase().trim();
    return category.productTypes.filter((t) => t.toLowerCase().includes(q));
  }, [category, searchQuery]);

  const handleSelect = useCallback(
    (type: string) => {
      onChange(type === selectedProductType ? null : type);
      setOpen(false);
      setSearchQuery('');
    },
    [onChange, selectedProductType]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  if (!category) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px] flex items-center gap-1.5">
        <Boxes className="h-3.5 w-3.5 text-teal-600" />
        Тип товара:
      </Label>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearchQuery(''); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[400px] justify-between text-left font-normal h-10"
          >
            {selectedProductType ? (
              <span className="truncate flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                {selectedProductType}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Все типы ({category.productTypes.length})...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[480px] p-0" align="start">
          <Command shouldFilter={false} className="rounded-lg">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder={`Поиск по ${category.productTypes.length} типам товара...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="border-0 focus:ring-0 h-9"
              />
            </div>
            <CommandList className="max-h-[320px]">
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Тип товара не найден
                </div>
              </CommandEmpty>
              <CommandGroup heading={<span className="text-xs font-semibold">Типы товаров в «{category.name}»</span>}>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect('__all__')}
                  className="cursor-pointer"
                >
                  <Check
                    className={`mr-2 h-4 w-4 shrink-0 ${!selectedProductType ? 'opacity-100 text-teal-600' : 'opacity-0'}`}
                  />
                  <span className="flex-1 text-muted-foreground italic">Все типы ({category.productTypes.length})</span>
                </CommandItem>
                {filteredTypes.map((type) => (
                  <CommandItem
                    key={type}
                    value={type}
                    onSelect={() => handleSelect(type)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 shrink-0 ${selectedProductType === type ? 'opacity-100 text-teal-600' : 'opacity-0'}`}
                    />
                    <span className="truncate flex-1">{type}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedProductType && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
          aria-label="Очистить тип товара"
        >
          <X className="h-3.5 w-3.5" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
