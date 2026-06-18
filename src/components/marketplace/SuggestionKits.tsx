'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles, Gift, Leaf, Crown, Home, Zap, Heart, Baby,
  TrendingUp, ChevronRight, ChevronDown, Check,
} from 'lucide-react';

interface SuggestionKitsProps {
  /** Current custom keywords — kits hide themselves if all their words are already present */
  currentKeywords: string[];
  /** Callback to add a kit's keywords to the user's list */
  onAddKeywords: (newKeywords: string[]) => void;
}

/** Each kit is a themed bundle of high-converting Russian marketplace hashtags. */
interface Kit {
  id: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  color: string;
  description: string;
  keywords: string[];
}

const KITS: Kit[] = [
  {
    id: 'sale',
    label: 'Распродажа',
    emoji: '🏷️',
    icon: TrendingUp,
    color: 'rose',
    description: 'Скидки, акции, выгодные предложения',
    keywords: ['распродажа', 'скидка', 'акция', 'выгодно', 'дешево', 'промокод'],
  },
  {
    id: 'new',
    label: 'Новинки',
    emoji: '✨',
    icon: Sparkles,
    color: 'violet',
    description: 'Свежее поступление, тренды сезона',
    keywords: ['новинка', 'тренд', 'свежее', 'модный', 'стильный', 'хит2024'],
  },
  {
    id: 'gift',
    label: 'Подарки',
    emoji: '🎁',
    icon: Gift,
    color: 'amber',
    description: 'Идеи для праздников и подарков',
    keywords: ['подарок', 'идея', 'праздник', 'сюрприз', 'настоящий', 'внимание'],
  },
  {
    id: 'eco',
    label: 'Эко',
    emoji: '🌿',
    icon: Leaf,
    color: 'emerald',
    description: 'Натуральное, экологичное, безопасное',
    keywords: ['эко', 'натуральный', 'природа', 'безопасный', 'гипоаллергенный', 'органик'],
  },
  {
    id: 'premium',
    label: 'Премиум',
    emoji: '👑',
    icon: Crown,
    color: 'amber',
    description: 'Роскошь, эксклюзив, высокое качество',
    keywords: ['премиум', 'люкс', 'эксклюзив', 'класс', 'статус', 'элита'],
  },
  {
    id: 'cozy',
    label: 'Уют',
    emoji: '🏡',
    icon: Home,
    color: 'teal',
    description: 'Дом, тепло, комфорт',
    keywords: ['уют', 'дом', 'комфорт', 'тепло', 'уютный', 'домашний'],
  },
  {
    id: 'love',
    label: 'Любовь',
    emoji: '❤️',
    icon: Heart,
    color: 'rose',
    description: 'Романтика, нежность, для близких',
    keywords: ['любовь', 'романтика', 'нежность', 'сердце', 'любимый', 'валентинка'],
  },
  {
    id: 'kids',
    label: 'Детям',
    emoji: '🧸',
    icon: Baby,
    color: 'cyan',
    description: 'Для детей, безопасность, развитие',
    keywords: ['детям', 'детский', 'малыш', 'ребенок', 'безопасный', 'развивающий'],
  },
];

const COLOR_CLASSES: Record<string, {
  chip: string;
  icon: string;
  count: string;
  hover: string;
}> = {
  rose: {
    chip: 'border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
    icon: 'text-rose-500',
    count: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    hover: 'hover:border-rose-300 hover:bg-rose-100/80 dark:hover:border-rose-700 dark:hover:bg-rose-900/40',
  },
  violet: {
    chip: 'border-violet-200 bg-violet-50/60 text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300',
    icon: 'text-violet-500',
    count: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
    hover: 'hover:border-violet-300 hover:bg-violet-100/80 dark:hover:border-violet-700 dark:hover:bg-violet-900/40',
  },
  amber: {
    chip: 'border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
    icon: 'text-amber-500',
    count: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    hover: 'hover:border-amber-300 hover:bg-amber-100/80 dark:hover:border-amber-700 dark:hover:bg-amber-900/40',
  },
  emerald: {
    chip: 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300',
    icon: 'text-emerald-500',
    count: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    hover: 'hover:border-emerald-300 hover:bg-emerald-100/80 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40',
  },
  teal: {
    chip: 'border-teal-200 bg-teal-50/60 text-teal-700 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-300',
    icon: 'text-teal-500',
    count: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
    hover: 'hover:border-teal-300 hover:bg-teal-100/80 dark:hover:border-teal-700 dark:hover:bg-teal-900/40',
  },
  cyan: {
    chip: 'border-cyan-200 bg-cyan-50/60 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-300',
    icon: 'text-cyan-500',
    count: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    hover: 'hover:border-cyan-300 hover:bg-cyan-100/80 dark:hover:border-cyan-700 dark:hover:bg-cyan-900/40',
  },
};

/**
 * Quick-add "kits" of curated Russian hashtags for marketplace sellers.
 *
 * Each kit bundles 6 themed high-conversion tags (распродажа/скидка/акция for
 * sales, эко/натуральный for eco, etc.) so users can one-tap inject them into
 * their custom keywords list rather than typing each one.
 *
 * Use case: sellers running seasonal promos or themed listings want fast
 * access to proven hashtag combinations without manual curation.
 *
 * UI: a collapsible panel with 8 horizontally-wrapped colored chips. Each
 * chip shows the kit name + emoji + count badge. Click adds the keywords
 * (skipping any that already exist) and triggers a toast.
 *
 * Hidden when collapsed to save vertical space on first visit.
 */
export function SuggestionKits({
  currentKeywords,
  onAddKeywords,
}: SuggestionKitsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Normalized set of current keywords for fast "already-added" checks
  const currentSet = useMemo(
    () => new Set(currentKeywords.map(k => k.toLowerCase().trim())),
    [currentKeywords]
  );

  const handleAddKit = useCallback((kit: Kit) => {
    const newOnes = kit.keywords.filter(k => !currentSet.has(k.toLowerCase()));
    if (newOnes.length === 0) {
      // All keywords already present — nothing to add
      setLastAddedId(kit.id);
      setTimeout(() => setLastAddedId(null), 1500);
      return;
    }
    onAddKeywords([...currentKeywords, ...newOnes]);
    setLastAddedId(kit.id);
    setTimeout(() => setLastAddedId(null), 1800);
  }, [currentKeywords, currentSet, onAddKeywords]);

  return (
    <div className="rounded-xl border border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-rose-50/20 dark:from-amber-950/10 dark:via-orange-950/5 dark:to-rose-950/5 p-3 space-y-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-sm font-medium text-foreground hover:opacity-80 transition-opacity group"
        aria-expanded={isOpen}
      >
        <span className="h-6 w-6 rounded-md bg-gradient-to-br from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
          <Zap className="h-3.5 w-3.5" />
        </span>
        <span>Готовые наборы хештегов</span>
        <span className="text-[10px] text-muted-foreground/70 italic font-normal">
          ({KITS.length} тематик)
        </span>
        <span className="ml-auto text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] text-muted-foreground/80 italic">
            Нажмите на набор, чтобы добавить его ключевые слова в свой список.
            Дубликаты автоматически пропускаются.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {KITS.map((kit) => {
              const KitIcon = kit.icon;
              const colors = COLOR_CLASSES[kit.color] ?? COLOR_CLASSES.violet;
              // Count how many kit keywords are missing from current set
              const missing = kit.keywords.filter(k => !currentSet.has(k.toLowerCase())).length;
              const isFullyAdded = missing === 0;
              const isJustAdded = lastAddedId === kit.id;

              return (
                <Tooltip key={kit.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleAddKit(kit)}
                      className={`group/kit inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-200 ${colors.chip} ${colors.hover} ${isJustAdded ? 'ring-2 ring-emerald-300 dark:ring-emerald-700' : ''}`}
                    >
                      <span className="text-sm leading-none">{kit.emoji}</span>
                      <KitIcon className={`h-3 w-3 ${colors.icon}`} />
                      <span>{kit.label}</span>
                      <span className={`inline-flex items-center justify-center text-[9px] font-mono px-1 rounded ${colors.count} tabular-nums leading-none h-3.5 min-w-[14px]`}>
                        {isFullyAdded ? '✓' : missing}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold mb-0.5">{kit.label} {kit.emoji}</div>
                      <div className="text-muted-foreground mb-1">{kit.description}</div>
                      <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        {kit.keywords.map(k => '#' + k).join(' ')}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {isFullyAdded ? '✓ Все уже добавлены' : `${missing} из ${kit.keywords.length} новых`}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {lastAddedId && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-left-1 duration-200">
              <Check className="h-3 w-3" />
              <span>Ключевые слова добавлены в список</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
