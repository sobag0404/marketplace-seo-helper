'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings2, Hash, Globe, Layers, Info, Star, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { GenerationSettings } from '@/lib/marketplace/types';

interface GenerationSettingsPanelProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
}

export function GenerationSettingsPanel({ settings, onSettingsChange }: GenerationSettingsPanelProps) {
  const updateSetting = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const isBelowDefault = settings.targetHashtagCount < 10;
  const isAboveDefault = settings.targetHashtagCount > 10;

  return (
    <div className="space-y-4 rounded-lg border border-teal-100/60 dark:border-teal-900/30 bg-gradient-to-br from-teal-50/30 via-transparent to-cyan-50/20 dark:from-teal-950/10 dark:to-cyan-950/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-5 w-5 rounded-md bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm">
          <Settings2 className="h-3 w-3 text-white" />
        </div>
        <span className="text-sm font-semibold text-foreground">Параметры генерации</span>
      </div>

      {/* Target hashtag count */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-purple-500" />
            <Label className="text-xs font-medium">Количество хештегов</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[240px]">
                <p className="text-xs">Желаемое количество хештегов для каждого товара. При 1 — только самый популярный. При нехватке добавляются хештеги из смежных категорий.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-2.5 py-0.5 h-5 font-mono tabular-nums transition-all duration-200 ${
              isBelowDefault
                ? 'border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                : isAboveDefault
                ? 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20'
            }`}
          >
            {settings.targetHashtagCount}
          </Badge>
        </div>
        <Slider
          value={[settings.targetHashtagCount]}
          onValueChange={([val]) => updateSetting('targetHashtagCount', val)}
          min={1}
          max={30}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5" />
            1 — самый популярный
          </span>
          <span>10 — по умолчанию</span>
          <span>30 — максимум</span>
        </div>
        {settings.targetHashtagCount === 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-200/60 dark:border-amber-800/40 animate-in fade-in slide-in-from-top-1 duration-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Будет выбран только самый популярный хештег</span>
          </div>
        )}
        {settings.targetHashtagCount <= 5 && settings.targetHashtagCount > 1 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/15 border border-teal-200/40 dark:border-teal-800/30">
            <span className="text-[10px]">🎯</span>
            <span className="text-[11px] text-teal-700 dark:text-teal-400">Топ-{settings.targetHashtagCount} самых популярных хештегов</span>
          </div>
        )}
      </div>

      <Separator className="bg-teal-100/50 dark:bg-teal-900/20" />

      {/* Russian first toggle */}
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <Globe className="h-3 w-3 text-teal-600 dark:text-teal-400" />
          </div>
          <Label className="text-xs font-medium cursor-pointer">Русский приоритет</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px]">
              <p className="text-xs">Русскоязычные хештеги идут первыми. Английские допускаются только для брендов (Ford, BMW) и популярных слов (love, kawaii).</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={settings.russianFirst}
          onCheckedChange={(checked) => updateSetting('russianFirst', checked)}
          className="data-[state=checked]:bg-teal-600"
        />
      </div>

      {/* Use related categories toggle */}
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Layers className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
          <Label className="text-xs font-medium cursor-pointer">Смежные категории</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[240px]">
              <p className="text-xs">Добавлять хештеги из смежных категорий, если не набрано нужное количество. Хештеги берутся только по смыслу.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Switch
          checked={settings.useRelatedCategories}
          onCheckedChange={(checked) => updateSetting('useRelatedCategories', checked)}
          className="data-[state=checked]:bg-amber-600"
        />
      </div>
    </div>
  );
}
