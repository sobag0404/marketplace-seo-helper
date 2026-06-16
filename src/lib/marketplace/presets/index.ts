import type { Preset } from '../types';
import { blanketPreset } from './blankets';
import { pillowsPreset } from './pillows';
import { cushionsPreset } from './cushions';
import { flagsPreset } from './flags';
import { phoneCasesPreset } from './phoneCases';
import { autoAccessoriesPreset } from './autoAccessories';
import { apparelPreset } from './apparel';
import { kitchenPreset } from './kitchen';
import { petProductsPreset } from './petProducts';
import { kidsToysPreset } from './kidsToys';
import { homeDecorPreset } from './homeDecor';
import { gardenProductsPreset } from './gardenProducts';
import { beautyPreset } from './beauty';
import { sportsPreset } from './sports';
import { officeSuppliesPreset } from './officeSupplies';
import { electronicsPreset } from './electronics';

/** Реестр всех доступных пресетов */
export const allPresets: Preset[] = [
  blanketPreset,
  pillowsPreset,
  cushionsPreset,
  flagsPreset,
  phoneCasesPreset,
  petProductsPreset,
  kidsToysPreset,
  kitchenPreset,
  autoAccessoriesPreset,
  apparelPreset,
  homeDecorPreset,
  gardenProductsPreset,
  beautyPreset,
  sportsPreset,
  officeSuppliesPreset,
  electronicsPreset,
];

/** Найти пресет по ID */
export function getPresetById(id: string): Preset | undefined {
  return allPresets.find((p) => p.id === id);
}

/** Человекочитаемые названия для пресетов */
export const presetLabels: Record<string, string> = {
  blankets: '🛏️ Флисовые пледы',
  pillows: '🛋️ Декоративные подушки',
  cushions: '🪡 Наволочки',
  flags: '🏴 Флаги и вымпелы',
  phoneCases: '📱 Чехлы на телефон',
  autoAccessories: '🚗 Автотовары',
  petProducts: '🐕 Товары для животных',
  kitchen: '🍳 Кухонные принадлежности',
  apparel: '👕 Одежда и принты',
  kidsToys: '🧸 Детские игрушки',
  homeDecor: '🏠 Домашний декор',
  gardenProducts: '🌱 Сад и огород',
  beauty: '💄 Красота и косметика',
  sports: '⚽ Спортивные товары',
  officeSupplies: '📎 Канцелярские товары',
  electronics: '🔌 Электроника и аксессуары',
};
