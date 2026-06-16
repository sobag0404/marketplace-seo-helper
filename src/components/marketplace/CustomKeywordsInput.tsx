'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, X, Tag, Eye, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Preset } from '@/lib/marketplace/types';
import { findMatchingRulesForAnalytics } from '@/lib/marketplace/hashtagGenerator';
import { GROUP_LABELS } from './HashtagAnalytics';

interface CustomKeywordsInputProps {
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  preset: Preset;
}

export function CustomKeywordsInput({ keywords, onKeywordsChange, preset }: CustomKeywordsInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Real-time preview: show which rule groups match the current input
  const previewMatches = useMemo(() => {
    const val = inputValue.trim().toLowerCase();
    if (!val) return [];
    const matched = findMatchingRulesForAnalytics(val, preset.rules);
    return matched.slice(0, 5).map(r => ({
      id: r.id,
      label: GROUP_LABELS[r.id] || r.id,
      hashtags: r.hashtags.slice(0, 3),
    }));
  }, [inputValue, preset.rules]);

  const addKeyword = useCallback(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed || keywords.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onKeywordsChange([...keywords, trimmed]);
    setInputValue('');
  }, [inputValue, keywords, onKeywordsChange]);

  const removeKeyword = useCallback((idx: number) => {
    onKeywordsChange(keywords.filter((_, i) => i !== idx));
  }, [keywords, onKeywordsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Tag className="h-4 w-4 text-purple-500" />
        <span>Дополнительные ключевые слова</span>
        {keywords.length > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            {keywords.length}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Добавьте ключевые слова, и хештеги будут подбираться с их учётом
      </p>
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите ключевое слово..."
            className="text-sm h-9"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addKeyword}
            disabled={!inputValue.trim()}
            className="gap-1 shrink-0 h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
        </div>

        {/* Real-time keyword preview */}
        {inputValue.trim() && previewMatches.length > 0 && (
          <div className="mt-2 p-2.5 rounded-lg border bg-gradient-to-r from-purple-50/50 to-teal-50/30 dark:from-purple-950/20 dark:to-teal-950/10 border-purple-200/60 dark:border-purple-800/40 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="h-3 w-3 text-purple-500" />
              <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                Предпросмотр совпадений
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {previewMatches.map((match) => (
                <div key={match.id} className="flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-50/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50 border"
                  >
                    {match.label}
                  </Badge>
                  <div className="flex gap-0.5">
                    {match.hashtags.map((ht, i) => (
                      <span key={i} className="text-[9px] text-purple-500/70 dark:text-purple-400/70 font-mono">
                        {ht}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {inputValue.trim() && previewMatches.length === 0 && (
          <div className="mt-2 p-2 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] text-amber-600 dark:text-amber-400">
                Будет добавлен как пользовательский хештег (нет совпадений с существующими группами)
              </span>
            </div>
          </div>
        )}
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {keywords.map((kw, idx) => (
            <Badge
              key={`${kw}-${idx}`}
              variant="secondary"
              className="group/kw inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                bg-amber-50/80 text-amber-700 border-amber-200/80
                dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60
                hover:bg-amber-100 dark:hover:bg-amber-900/50
                transition-all duration-200 border"
            >
              {kw}
              <X
                className="h-3 w-3 opacity-50 group-hover/kw:opacity-100 transition-opacity cursor-pointer hover:text-red-500"
                onClick={() => removeKeyword(idx)}
              />
            </Badge>
          ))}
          <button
            onClick={() => onKeywordsChange([])}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1"
          >
            Очистить все
          </button>
        </div>
      )}
    </div>
  );
}
