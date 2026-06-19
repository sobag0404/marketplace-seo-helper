'use client';

import { FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoModeButtonProps {
  onLoadDemo: (buffer: ArrayBuffer, fileName: string) => void;
}

const DEMO_DATA = [
  ['Артикул', 'Наименование', 'Категория', 'Цена'],
  ['ART001', 'Плед флисовый с принтом кот мем', 'Пледы и покрывала', '1200'],
  ['ART002', 'Плед с приколом для мамы', 'Пледы и покрывала', '980'],
  ['ART003', 'Плед аниме kawaii', 'Пледы', '1500'],
  ['ART004', 'Плед русский стиль медведь', 'Пледы и покрывала', '1100'],
  ['ART005', 'Постельное белье новогоднее', 'Постельное белье', '1300'],
  ['ART006', 'Постельное белье летнее', 'Постельное белье', '890'],
  ['ART007', 'Полотенце банное большое', 'Полотенца', '1050'],
  ['ART008', 'Плед подарок папе', 'Пледы', '950'],
  ['ART009', 'Плед с принтом собака хаски', 'Пледы и покрывала', '1250'],
  ['ART010', 'Одеяло космос галактика', 'Одеяла', '1400'],
  ['ART011', 'Плед кофе латте бариста', 'Пледы', '870'],
  ['ART012', 'Подушка мотивация цитата', 'Подушки', '990'],
];

export function DemoModeButton({ onLoadDemo }: DemoModeButtonProps) {
  const handleDemo = async () => {
    // Dynamic import of xlsx to create demo data
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(DEMO_DATA);
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    onLoadDemo(buffer, 'demo_products.xlsx');
  };

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleDemo}
      className="gap-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
    >
      <FlaskConical className="h-5 w-5" />
      Попробовать демо
    </Button>
  );
}
