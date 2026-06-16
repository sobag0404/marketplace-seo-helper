'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { Download, Upload, Check, ChevronsUpDown, Search } from 'lucide-react';
import { allPresets, presetLabels } from '@/lib/marketplace/presets';
import { getCustomPresets, customPresetToPreset, type CustomPresetData } from './TemplateBuilder';
import type { Preset } from '@/lib/marketplace/types';

interface PresetSelectorProps {
  selectedPreset: Preset;
  onPresetChange: (preset: Preset) => void;
  onCustomPresetsChange?: (presets: CustomPresetData[]) => void;
}

export function PresetSelector({ selectedPreset, onPresetChange }: PresetSelectorProps) {
  const [customPresets, setCustomPresets] = useState<CustomPresetData[]>(() => getCustomPresets());
  const [open, setOpen] = useState(false);

  const handleImportPresets = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const imported: CustomPresetData[] = Array.isArray(data) ? data : data.presets ? data.presets : [];
        if (imported.length === 0) return;
        const existing = getCustomPresets();
        const existingIds = new Set(existing.map(p => p.id));
        let addedCount = 0;
        for (const preset of imported) {
          if (preset.id && preset.name && Array.isArray(preset.rules)) {
            if (existingIds.has(preset.id)) {
              preset.id = `${preset.id}_${Date.now()}`;
            }
            existing.push(preset as CustomPresetData);
            addedCount++;
          }
        }
        localStorage.setItem('custom-presets', JSON.stringify(existing));
        setCustomPresets(existing);
      } catch {
        // Invalid JSON
      }
    };
    input.click();
  }, []);

  const handleExportPresets = useCallback(() => {
    const presets = getCustomPresets();
    if (presets.length === 0) return;
    const json = JSON.stringify({ presets, version: 1 }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-presets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleSelect = useCallback((presetId: string) => {
    // Check custom presets first
    const custom = customPresets.find(p => p.id === presetId);
    if (custom) {
      onPresetChange(customPresetToPreset(custom));
    } else {
      const preset = allPresets.find(p => p.id === presetId);
      if (preset) onPresetChange(preset);
    }
    setOpen(false);
  }, [customPresets, onPresetChange]);

  const selectedLabel = presetLabels[selectedPreset.id] || selectedPreset.name;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <Label className="text-sm font-medium min-w-[140px]">
        Категория товаров:
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full sm:w-[320px] justify-between text-left font-normal h-10"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0" align="start">
          <Command shouldFilter={true} className="rounded-lg">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput placeholder="Поиск категории..." className="border-0 focus:ring-0 h-9" />
            </div>
            <CommandList className="max-h-[280px]">
              <CommandEmpty>Категория не найдена</CommandEmpty>
              <CommandGroup heading="Стандартные">
                {allPresets.map((preset) => (
                  <CommandItem
                    key={preset.id}
                    value={preset.id + ' ' + (presetLabels[preset.id] || preset.name)}
                    onSelect={() => handleSelect(preset.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedPreset.id === preset.id ? 'opacity-100 text-emerald-600' : 'opacity-0'}`}
                    />
                    <span className="truncate">{presetLabels[preset.id] || preset.name}</span>
                    {preset.relatedCategories && preset.relatedCategories.length > 0 && (
                      <span className="ml-auto text-[10px] text-muted-foreground/60">
                        +{preset.relatedCategories.length} смежн.
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              {customPresets.length > 0 && (
                <CommandGroup heading="Пользовательские">
                  {customPresets.map((preset) => (
                    <CommandItem
                      key={preset.id}
                      value={preset.id + ' ' + preset.name}
                      onSelect={() => handleSelect(preset.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${selectedPreset.id === preset.id ? 'opacity-100 text-purple-600' : 'opacity-0'}`}
                      />
                      <span className="truncate">{preset.name}</span>
                      <Badge variant="secondary" className="ml-2 text-[8px] px-1 py-0 h-3 bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/60">
                        custom
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {selectedPreset.description}
      </span>
      {customPresets.some(p => p.id === selectedPreset.id) && (
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400">
          Пользовательский
        </Badge>
      )}
      {/* Import/Export buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleImportPresets}
          className="h-7 w-7 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 transition-colors"
          title="Импорт пресетов из JSON"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
        {customPresets.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportPresets}
            className="h-7 w-7 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 transition-colors"
            title="Экспорт пресетов в JSON"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
