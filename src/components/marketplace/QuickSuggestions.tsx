'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { generateHashtagsFromCategory } from '@/lib/marketplace/categoryUtils';

interface QuickSuggestionsProps {
  /** Current hashtags string (space-separated) for the row */
  currentHashtags: string;
  /** Selected Ozon category ID — used to generate relevant suggestions */
  categoryId?: string;
  /** Optional product type within the category */
  productType?: string;
  /** Custom keywords added by the user */
  customKeywords?: string[];
  /** Product name to generate suggestions from */
  productName: string;
  /** Callback when a suggestion is clicked */
  onAddSuggestion: (hashtag: string) => void;
  /** Whether suggestions can be added (max tags not reached) */
  disabled?: boolean;
}

export function QuickSuggestions({
  currentHashtags,
  categoryId,
  productType,
  customKeywords = [],
  productName,
  onAddSuggestion,
  disabled = false,
}: QuickSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const suggestions = useMemo(() => {
    if (!categoryId || !productName || productName.trim().length === 0) {
      return [];
    }

    // Generate all potential hashtags for this product from the category
    const generated = generateHashtagsFromCategory(
      categoryId,
      productType,
      customKeywords,
      productName
    );
    if (generated.length === 0) return [];

    // Parse current hashtags into a Set for quick lookup
    const currentSet = new Set(
      currentHashtags
        .split(' ')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    );

    // Filter out hashtags that already exist (case-insensitive)
    const filtered = generated.filter(
      (tag) => !currentSet.has(tag.toLowerCase())
    );

    // Take up to 10 suggestions
    return filtered.slice(0, 10);
  }, [categoryId, productType, customKeywords, productName, currentHashtags]);

  const hasNoSuggestions = suggestions.length === 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400"
          disabled={disabled && hasNoSuggestions}
        >
          <Sparkles className="size-3.5" />
          Предложить хештеги
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-teal-200/60 bg-teal-50/50 p-3 dark:border-teal-800/40 dark:bg-teal-950/20">
          {hasNoSuggestions ? (
            <p className="text-xs text-muted-foreground">
              Все релевантные хештеги уже добавлены
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`cursor-pointer gap-1 border-teal-200 bg-teal-50 text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 ${
                    disabled ? 'pointer-events-none opacity-50' : ''
                  }`}
                  onClick={() => {
                    if (!disabled) {
                      onAddSuggestion(tag);
                    }
                  }}
                >
                  <Plus className="size-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
