'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Tag, Sparkles, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CustomKeywordsInputProps {
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

export function CustomKeywordsInput({ keywords, onKeywordsChange }: CustomKeywordsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addKeyword = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Support comma-separated input: "плед, флис, теплый" → 3 keywords
    const newKeywords = trimmed
      .split(/[,;]/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    const unique = [...new Set([...keywords, ...newKeywords])];
    onKeywordsChange(unique);
    setInputValue('');
  }, [inputValue, keywords, onKeywordsChange]);

  const removeKeyword = useCallback((idx: number) => {
    onKeywordsChange(keywords.filter((_, i) => i !== idx));
  }, [keywords, onKeywordsChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  }, [addKeyword]);

  // Preview: show what hashtags will be generated from current input
  const previewTags = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return [];
    const words = val.split(/[\s,;]+/).filter(w => w.length > 0);
    return words.slice(0, 6).map(w => {
      const tag = w.startsWith('#') ? w.toLowerCase() : '#' + w.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
      return tag.length <= 30 ? tag : null;
    }).filter(Boolean) as string[];
  }, [inputValue]);

  const preview = previewTags();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Tag className="h-4 w-4 text-purple-500" />
        <span>Свои ключевые слова</span>
        {keywords.length > 0 && (
          <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            {keywords.length}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Пишите простыми словами через запятую — они станут хештегами. Например: «плед, флис, тёплый» → #плед #флис #тёплый
      </p>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="плед, флис, тёплый, подарок..."
            className="text-sm h-9 flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addKeyword}
            disabled={!inputValue.trim()}
            className="gap-1 shrink-0 h-9 bg-purple-50/50 hover:bg-purple-100/80 text-purple-700 border-purple-200/80 dark:bg-purple-950/30 dark:hover:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
        </div>

        {/* Live preview of hashtags from current input */}
        {inputValue.trim() && preview.length > 0 && (
          <div className="p-2.5 rounded-lg border bg-gradient-to-r from-purple-50/50 to-teal-50/30 dark:from-purple-950/20 dark:to-teal-950/10 border-purple-200/60 dark:border-purple-800/40 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                Получатся хештеги:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {preview.map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-[10px] font-mono bg-emerald-50/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50 border"
                >
                  {tag}
                </Badge>
              ))}
              {inputValue.split(/[\s,;]+/).filter(w => w.length > 0).length > 6 && (
                <span className="text-[10px] text-muted-foreground">+ещё...</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Added keywords */}
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
              <Sparkles className="h-2.5 w-2.5 text-amber-500/60" />
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
