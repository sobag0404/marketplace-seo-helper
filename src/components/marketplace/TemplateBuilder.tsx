'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Trash2,
  Save,
  BookTemplate,
  X,
  GripVertical,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Preset, HashtagRule } from '@/lib/marketplace/types';

const STORAGE_KEY = 'custom-presets';

export interface CustomPresetData {
  id: string;
  name: string;
  description: string;
  rules: HashtagRule[];
  baseHashtags: string[];
  universalHashtags: string[];
  forbiddenWords: string[];
  isCustom?: true;
}

function loadCustomPresets(): CustomPresetData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresets(presets: CustomPresetData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function getCustomPresets(): CustomPresetData[] {
  return loadCustomPresets();
}

export function customPresetToPreset(cp: CustomPresetData): Preset {
  return {
    id: cp.id,
    name: cp.name,
    description: cp.description,
    rules: cp.rules,
    baseHashtags: cp.baseHashtags,
    universalHashtags: cp.universalHashtags,
    forbiddenWords: cp.forbiddenWords,
  };
}

interface TemplateBuilderProps {
  onPresetCreated?: (preset: CustomPresetData) => void;
  onPresetDeleted?: (id: string) => void;
}

export function TemplateBuilder({ onPresetCreated, onPresetDeleted }: TemplateBuilderProps) {
  const [open, setOpen] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPresetData[]>(() => loadCustomPresets());
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const { toast } = useToast();

  // Form state
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');
  const [rules, setRules] = useState<HashtagRule[]>([]);
  const [baseHashtagsStr, setBaseHashtagsStr] = useState('');
  const [forbiddenStr, setForbiddenStr] = useState('');

  // New rule form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleKeywords, setNewRuleKeywords] = useState('');
  const [newRuleHashtags, setNewRuleHashtags] = useState('');

  const resetForm = useCallback(() => {
    setPresetName('');
    setPresetDesc('');
    setRules([]);
    setBaseHashtagsStr('');
    setForbiddenStr('');
    setNewRuleName('');
    setNewRuleKeywords('');
    setNewRuleHashtags('');
  }, []);

  const handleAddRule = useCallback(() => {
    const name = newRuleName.trim();
    const keywords = newRuleKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const hashtags = newRuleHashtags.split(',').map(h => h.trim()).filter(Boolean).map(h => h.startsWith('#') ? h : '#' + h);

    if (!name || keywords.length === 0 || hashtags.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Заполните все поля',
        description: 'Название группы, ключевые слова и хештеги обязательны',
      });
      return;
    }

    const ruleId = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_');
    const newRule: HashtagRule = {
      id: ruleId,
      priority: 50 + rules.length,
      keywords,
      hashtags,
    };

    setRules(prev => [...prev, newRule]);
    setNewRuleName('');
    setNewRuleKeywords('');
    setNewRuleHashtags('');
  }, [newRuleName, newRuleKeywords, newRuleHashtags, rules.length, toast]);

  const handleRemoveRule = useCallback((idx: number) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    const name = presetName.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Укажите название пресета' });
      return;
    }
    if (rules.length === 0) {
      toast({ variant: 'destructive', title: 'Добавьте хотя бы одну группу правил' });
      return;
    }

    const id = `custom_${name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_')}_${Date.now()}`;
    const baseTags = baseHashtagsStr.split(/[, ]/).map(h => h.trim()).filter(Boolean).map(h => h.startsWith('#') ? h : '#' + h);
    const forbidden = forbiddenStr.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

    const newPreset: CustomPresetData = {
      id,
      name,
      description: presetDesc.trim() || `Пользовательский пресет: ${name}`,
      rules,
      baseHashtags: baseTags.length > 0 ? baseTags : ['#пользовательский'],
      universalHashtags: baseTags.slice(0, 5),
      forbiddenWords: forbidden,
      isCustom: true,
    };

    const updated = [...loadCustomPresets(), newPreset];
    saveCustomPresets(updated);
    setCustomPresets(updated);
    onPresetCreated?.(newPreset);
    resetForm();
    setMode('list');

    toast({
      title: 'Пресет сохранён',
      description: `${name} — ${rules.length} групп правил`,
    });
  }, [presetName, presetDesc, rules, baseHashtagsStr, forbiddenStr, onPresetCreated, resetForm, toast]);

  const handleDelete = useCallback((id: string) => {
    const updated = loadCustomPresets().filter(p => p.id !== id);
    saveCustomPresets(updated);
    setCustomPresets(updated);
    onPresetDeleted?.(id);

    toast({ title: 'Пресет удалён' });
  }, [onPresetDeleted, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomPresets(loadCustomPresets())}
          className="gap-1.5 text-xs border-dashed border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-400 transition-all duration-200"
        >
          <BookTemplate className="h-3.5 w-3.5" />
          Создать пресет
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-purple-500" />
            Конструктор пресетов
          </DialogTitle>
        </DialogHeader>

        {mode === 'list' ? (
          <div className="space-y-4">
            {/* Existing custom presets */}
            {customPresets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ваши пресеты</Label>
                <div className="space-y-2">
                  {customPresets.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors duration-200"
                    >
                      <div>
                        <p className="text-sm font-medium">{preset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {preset.rules.length} групп • {preset.rules.reduce((sum, r) => sum + r.hashtags.length, 0)} хештегов
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        onClick={() => handleDelete(preset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customPresets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookTemplate className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Нет пользовательских пресетов</p>
                <p className="text-xs mt-1">Создайте свой пресет с нужными группами хештегов</p>
              </div>
            )}

            <Button
              onClick={() => setMode('create')}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-md transition-all duration-300"
            >
              <Plus className="h-4 w-4" />
              Создать новый пресет
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Create form */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Название пресета *</Label>
                  <Input
                    value={presetName}
                    onChange={e => setPresetName(e.target.value)}
                    placeholder="Например: Товары для школы"
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Описание</Label>
                  <Input
                    value={presetDesc}
                    onChange={e => setPresetDesc(e.target.value)}
                    placeholder="Краткое описание"
                    className="text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Базовые хештеги (через запятую)</Label>
                <Input
                  value={baseHashtagsStr}
                  onChange={e => setBaseHashtagsStr(e.target.value)}
                  placeholder="#товары, #дляшколы, #школьник"
                  className="text-sm h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Запрещённые слова (через запятую)</Label>
                <Input
                  value={forbiddenStr}
                  onChange={e => setForbiddenStr(e.target.value)}
                  placeholder="бренд1, бренд2, размер"
                  className="text-sm h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Rules section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Группы правил ({rules.length})
              </Label>

              {/* Existing rules */}
              {rules.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {rules.map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-2 p-2.5 rounded-lg border bg-gradient-to-r from-purple-50/50 to-teal-50/30 dark:from-purple-950/20 dark:to-teal-950/10 border-purple-200/60 dark:border-purple-800/40 transition-all duration-200 animate-in fade-in slide-in-from-bottom-1"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{rule.id}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.keywords.slice(0, 4).map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-amber-50/80 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200/60">
                              {kw}
                            </Badge>
                          ))}
                          {rule.keywords.length > 4 && (
                            <span className="text-[9px] text-muted-foreground">+{rule.keywords.length - 4}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {rule.hashtags.slice(0, 3).map((ht, i) => (
                            <span key={i} className="text-[9px] text-purple-500/80 font-mono">{ht}</span>
                          ))}
                          {rule.hashtags.length > 3 && (
                            <span className="text-[9px] text-muted-foreground/50">+{rule.hashtags.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveRule(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new rule */}
              <div className="p-3 rounded-lg border-2 border-dashed border-purple-200/60 dark:border-purple-800/40 bg-purple-50/20 dark:bg-purple-950/10 space-y-2">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Новая группа</p>
                <div className="space-y-2">
                  <Input
                    value={newRuleName}
                    onChange={e => setNewRuleName(e.target.value)}
                    placeholder="Название группы (например: Школа)"
                    className="text-xs h-8"
                  />
                  <Input
                    value={newRuleKeywords}
                    onChange={e => setNewRuleKeywords(e.target.value)}
                    placeholder="Ключевые слова через запятую (школ, ученик, рюкзак)"
                    className="text-xs h-8"
                  />
                  <Input
                    value={newRuleHashtags}
                    onChange={e => setNewRuleHashtags(e.target.value)}
                    placeholder="Хештеги через запятую (#дляшколы, #школьный)"
                    className="text-xs h-8"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  disabled={!newRuleName.trim() || !newRuleKeywords.trim() || !newRuleHashtags.trim()}
                  className="w-full gap-1 text-xs h-8 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  Добавить группу
                </Button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => { setMode('list'); resetForm(); }}
                className="text-xs"
              >
                Назад
              </Button>
              <Button
                onClick={handleSave}
                disabled={!presetName.trim() || rules.length === 0}
                className="gap-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all duration-300"
              >
                <Save className="h-3.5 w-3.5" />
                Сохранить пресет
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
