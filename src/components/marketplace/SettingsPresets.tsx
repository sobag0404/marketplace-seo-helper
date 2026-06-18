'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Save, Upload, FileJson, Check, AlertCircle, Download, RotateCcw,
} from 'lucide-react';
import type { GenerationSettings } from '@/lib/marketplace/types';
import type { ExportFormat } from './ExportFormatSelector';

/** Shape of an exported settings preset */
export interface SettingsPreset {
  /** Schema version for forward-compat */
  schema: 1;
  /** When this preset was saved (ISO) */
  savedAt: string;
  /** Human-readable label */
  label: string;
  /** Selected Ozon category id (or null) */
  categoryId: string | null;
  /** Selected product type inside the category (or null) */
  productType: string | null;
  /** Custom keywords (free-form list) */
  customKeywords: string[];
  /** Generation settings (target count, limits, etc.) */
  generationSettings: GenerationSettings;
  /** Export format */
  exportFormat: ExportFormat;
  /** Merge-on-regen flag */
  mergeOnRegen: boolean;
}

interface SettingsPresetsProps {
  categoryId: string | null;
  productType: string | null;
  customKeywords: string[];
  generationSettings: GenerationSettings;
  exportFormat: ExportFormat;
  mergeOnRegen: boolean;
  onImport: (preset: SettingsPreset) => void;
  onToast: (title: string, description: string, variant?: 'default' | 'destructive') => void;
}

const DEFAULT_LABEL = 'Настройки генератора';

/**
 * Save / load full generator settings as a JSON file.
 *
 * Use case: sellers who run the tool on many files with the same config
 * (category, keywords, format) can save once and reload for each new file,
 * skipping manual reconfiguration.
 */
export function SettingsPresets({
  categoryId,
  productType,
  customKeywords,
  generationSettings,
  exportFormat,
  mergeOnRegen,
  onImport,
  onToast,
}: SettingsPresetsProps) {
  const [lastAction, setLastAction] = useState<'save' | 'load' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildPreset = useCallback((): SettingsPreset => {
    return {
      schema: 1,
      savedAt: new Date().toISOString(),
      label: DEFAULT_LABEL,
      categoryId,
      productType,
      customKeywords,
      generationSettings,
      exportFormat,
      mergeOnRegen,
    };
  }, [categoryId, productType, customKeywords, generationSettings, exportFormat, mergeOnRegen]);

  const handleSave = useCallback(() => {
    const preset = buildPreset();
    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `msh-settings-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLastAction('save');
    onToast(
      'Настройки сохранены',
      `msh-settings-${dateStr}.json • категория: ${categoryId ?? '—'} • формат: ${exportFormat}`
    );
  }, [buildPreset, categoryId, exportFormat, onToast]);

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<SettingsPreset>;
        if (parsed.schema !== 1) {
          throw new Error(`Неподдерживаемая версия: schema=${String(parsed.schema)}`);
        }
        if (!('generationSettings' in parsed) || !('exportFormat' in parsed)) {
          throw new Error('Неверный формат файла настроек');
        }
        onImport({
          schema: 1,
          savedAt: parsed.savedAt ?? new Date().toISOString(),
          label: parsed.label ?? DEFAULT_LABEL,
          categoryId: parsed.categoryId ?? null,
          productType: parsed.productType ?? null,
          customKeywords: Array.isArray(parsed.customKeywords) ? parsed.customKeywords : [],
          generationSettings: parsed.generationSettings as GenerationSettings,
          exportFormat: parsed.exportFormat as ExportFormat,
          mergeOnRegen: Boolean(parsed.mergeOnRegen),
        });
        setLastAction('load');
        onToast(
          'Настройки загружены',
          `${file.name} • категория: ${parsed.categoryId ?? '—'} • ${parsed.customKeywords?.length ?? 0} ключевиков`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Не удалось прочитать файл';
        onToast('Ошибка загрузки', msg, 'destructive');
      } finally {
        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onImport, onToast]
  );

  const canSave = Boolean(categoryId || customKeywords.length > 0);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            title="Сохранить / загрузить настройки"
          >
            {lastAction ? (
              <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-300" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Настройки
            <RotateCcw className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
            <FileJson className="h-3.5 w-3.5" />
            Сохранить / загрузить настройки
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSave}
            disabled={!canSave}
            className="cursor-pointer flex-col items-start gap-0.5 py-2"
          >
            <div className="flex items-center gap-2 w-full">
              <Download className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium flex-1">Сохранить в файл</span>
              {lastAction === 'save' && (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground pl-5.5">
              Категория, ключевики, формат, лимиты — в JSON
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLoadClick}
            className="cursor-pointer flex-col items-start gap-0.5 py-2"
          >
            <div className="flex items-center gap-2 w-full">
              <Upload className="h-3.5 w-3.5 text-violet-500 shrink-0" />
              <span className="text-sm font-medium flex-1">Загрузить из файла</span>
              {lastAction === 'load' && (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground pl-5.5">
              Импорт ранее сохранённых настроек (.json)
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              Настройки не включают данные файла — только конфигурацию генератора
            </span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
