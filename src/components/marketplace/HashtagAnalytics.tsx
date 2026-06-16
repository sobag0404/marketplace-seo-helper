'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Hash, Tag } from 'lucide-react';
import type { TableRow, Preset } from '@/lib/marketplace/types';
import { findMatchingRulesForAnalytics } from '@/lib/marketplace/hashtagGenerator';

/** Mapping from English group IDs to Russian labels — shared across components */
export const GROUP_LABELS: Record<string, string> = {
  // Common groups across presets
  humor: 'Юмор',
  cats: 'Кошки',
  dogs: 'Собаки',
  family: 'Семья',
  love: 'Любовь',
  patriot: 'Патриотизм',
  russianStyle: 'Русский стиль',
  newYear: 'Новый год',
  gift: 'Подарки',
  kids: 'Дети',
  eco: 'Эко',
  floral: 'Цветы',
  anime: 'Аниме',
  gaming: 'Игры',
  gothic: 'Готика',
  cute: 'Милота',
  space: 'Космос',
  music: 'Музыка',
  minimalism: 'Минимализм',
  food: 'Еда',
  coffee: 'Кофе',
  motivation: 'Мотивация',
  sports: 'Спорт',
  travel: 'Путешествия',
  // Blankets
  warm: 'Тепло',
  winter: 'Зима',
  cozy: 'Уют',
  nature: 'Природа',
  zodiac: 'Зодиак',
  hobby: 'Хобби',
  retro: 'Ретро',
  summer: 'Лето',
  picnic: 'Пикник',
  football: 'Футбол',
  army: 'Армия',
  profession: 'Профессия',
  car: 'Авто',
  // Pillows
  decor: 'Декор',
  interior: 'Интерьер',
  modern: 'Модерн',
  classic: 'Классика',
  // Phone cases
  moto: 'Мото',
  abstract: 'Абстракция',
  neon: 'Неон',
  // Flags
  sport: 'Спорт',
  military: 'Военные',
  country: 'Страны',
  // Auto accessories
  racing: 'Гонки',
  offroad: 'Оффроуд',
  tuning: 'Тюнинг',
  jdm: 'JDM',
  drift: 'Дрифт',
  truck: 'Грузовики',
  taxi: 'Такси',
  electric: 'Электро',
  premium: 'Премиум',
  suv: 'Внедорожник',
  // Apparel
  streetwear: 'Стритвир',
  // Kitchen
  baking: 'Выпечка',
  tea: 'Чай',
  japanese: 'Японская',
  italian: 'Итальянская',
  grill: 'Гриль',
  spice: 'Специи',
  healthy: 'Здоровье',
  // Pet products
  aquarium: 'Аквариум',
  birds: 'Птицы',
  rodent: 'Грызуны',
  exotic: 'Экзотика',
  winter_pet: 'Зима',
  toy: 'Игрушки',
  grooming: 'Груминг',
  sleeping: 'Сон',
  training: 'Дрессировка',
  health: 'Здоровье',
  // Kids toys
  educational: 'Обучение',
  doll: 'Куклы',
  constructor: 'Конструктор',
  puzzle: 'Пазлы',
  outdoor: 'Улица',
  soft: 'Мягкие',
  creative: 'Творчество',
  musical: 'Музыкальные',
  bath: 'Купание',
  baby: 'Малыши',
  interactive: 'Интерактив',
  // Home decor
  minimalist: 'Минимализм',
  scandinavian: 'Скандинавский',
  loft: 'Лофт',
  boho: 'Бохо',
  vintage: 'Винтаж',
  provence: 'Прованс',
  candle: 'Свечи',
  textile: 'Текстиль',
  wallDecor: 'Настенный декор',
  light: 'Освещение',
  // Garden
  garden: 'Сад',
  vegetable: 'Овощи',
  flower: 'Цветы',
  fruit: 'Фрукты',
  berry: 'Ягоды',
  greenhouse: 'Теплицы',
  tool: 'Инструменты',
  watering: 'Полив',
  planting: 'Посадка',
  landscape: 'Ландшафт',
  dacha: 'Дача',
  // Beauty
  skincare: 'Уход за кожей',
  makeup: 'Макияж',
  nails: 'Ногти',
  hair: 'Волосы',
  body: 'Тело',
  aroma: 'Аромат',
  natural: 'Натуральное',
  korean: 'Корейская',
  luxury: 'Люкс',
  spa: 'Спа',
  // Sports
  running: 'Бег',
  gym: 'Тренажёрный зал',
  yoga: 'Йога',
  swimming: 'Плавание',
  cycling: 'Велоспорт',
  combat: 'Единоборства',
  team: 'Командный спорт',
  dance: 'Танцы',
  recovery: 'Восстановление',
  // Custom
  custom: 'Пользовательские',
  // Office supplies
  pen: 'Ручки',
  notebook: 'Тетради/Блокноты',
  art: 'Творчество',
  organizer: 'Организация',
  desk: 'Рабочий стол',
  school: 'Школа',
  craft: 'Рукоделие',
  sticker: 'Стикеры',
  bag: 'Сумки/Рюкзаки',
  calculator: 'Техника',
  // Electronics
  headphones: 'Наушники',
  charging: 'Зарядка',
  case: 'Чехлы/Корпуса',
  keyboard: 'Клавиатуры',
  monitor: 'Мониторы',
  camera: 'Камеры',
  smartwatch: 'Умные часы',
  speaker: 'Колонки',
  storage: 'Хранение',
  cable: 'Кабели',
};

interface HashtagAnalyticsProps {
  processedRows: TableRow[];
  preset: Preset;
  nameColumn: string;
}

interface GroupStat {
  id: string;
  label: string;
  count: number;
  percentage: number;
}

interface TopHashtag {
  tag: string;
  count: number;
}

export function HashtagAnalytics({ processedRows, preset, nameColumn }: HashtagAnalyticsProps) {
  const { groupStats, topHashtags, totalUniqueHashtags, avgPerRow } = useMemo(() => {
    const groupMap: Record<string, number> = {};
    const hashtagMap: Record<string, number> = {};
    let totalTags = 0;
    let rowsWithTags = 0;
    const uniqueTags = new Set<string>();

    for (const row of processedRows) {
      if (!row.hashtags) continue;
      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      if (tags.length > 0) {
        rowsWithTags++;
        totalTags += tags.length;
        tags.forEach((tag) => {
          uniqueTags.add(tag);
          hashtagMap[tag] = (hashtagMap[tag] || 0) + 1;
        });
      }

      // Find which rule groups matched this row
      const nameValue = row.cells[nameColumn];
      if (nameValue && typeof nameValue === 'string' && nameValue.trim()) {
        const matched = findMatchingRulesForAnalytics(nameValue, preset.rules);
        for (const rule of matched) {
          groupMap[rule.id] = (groupMap[rule.id] || 0) + 1;
        }
      }
    }

    const totalRows = processedRows.length;
    const groupStats: GroupStat[] = Object.entries(groupMap)
      .map(([id, count]) => ({
        id,
        label: GROUP_LABELS[id] || id,
        count,
        percentage: totalRows > 0 ? Math.round((count / totalRows) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topHashtags: TopHashtag[] = Object.entries(hashtagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      groupStats,
      topHashtags,
      totalUniqueHashtags: uniqueTags.size,
      avgPerRow: rowsWithTags > 0 ? (totalTags / rowsWithTags).toFixed(1) : '0',
    };
  }, [processedRows, preset, nameColumn]);

  const maxGroupCount = groupStats.length > 0 ? groupStats[0].count : 1;
  const maxHashtagCount = topHashtags.length > 0 ? topHashtags[0].count : 1;

  if (processedRows.length === 0 || groupStats.length === 0) return null;

  const groupColors = [
    'bg-emerald-500', 'bg-teal-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-sky-500', 'bg-orange-500', 'bg-lime-500',
    'bg-cyan-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-pink-500',
  ];

  return (
    <Card className="shadow-sm border overflow-hidden relative card-shine">
      {/* Gradient top border */}
      <div className="h-1.5 bg-gradient-to-r from-purple-400 via-rose-400 to-amber-400" />
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Аналитика хештегов
          </h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400">
              <Hash className="h-3 w-3 mr-0.5" />
              {totalUniqueHashtags} уникальных
            </Badge>
            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              ~{avgPerRow}/строку
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Matched Groups Bar Chart */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              Совпадения по группам
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {groupStats.slice(0, 12).map((stat, idx) => (
                <div key={stat.id} className="flex items-center gap-2 group">
                  <span className="text-[11px] font-medium text-foreground w-24 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" title={stat.id}>
                    {stat.label}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${groupColors[idx % groupColors.length]}`}
                      style={{ width: `${Math.max((stat.count / maxGroupCount) * 100, 3)}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium text-foreground/70 tabular-nums">
                      {stat.count} ({stat.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Hashtags */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3 w-3" />
              Топ-15 хештегов
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {topHashtags.map((ht, idx) => (
                <div key={ht.tag} className="flex items-center gap-2 group">
                  <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 w-28 truncate group-hover:text-purple-500 transition-colors">
                    {ht.tag}
                  </span>
                  <div className="flex-1 bg-muted/50 rounded-full h-5 overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-rose-400 transition-all duration-700 ease-out"
                      style={{ width: `${Math.max((ht.count / maxHashtagCount) * 100, 3)}%` }}
                    />
                    <span className="absolute right-2 top-0.5 text-[10px] font-medium text-foreground/70 tabular-nums">
                      {ht.count}×
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
