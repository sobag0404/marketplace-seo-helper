import * as XLSX from 'xlsx';
import type { ParseResult, TableRow } from './types';
import { nameColumnKeywords, articleColumnKeywords, categoryColumnKeywords } from './common';

/** Прочитать Excel- или CSV-файл и вернуть результат парсинга */
export function parseExcelFile(buffer: ArrayBuffer, fileName?: string, sheetName?: string): ParseResult {
  const isCsv = fileName?.toLowerCase().endsWith('.csv');

  let workbook: XLSX.WorkBook;
  if (isCsv) {
    // CSV: decode as text first, then parse
    const text = new TextDecoder('utf-8').decode(buffer);
    workbook = XLSX.read(text, { type: 'string', raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: 'array' });
  }

  const targetSheet = sheetName || workbook.SheetNames[0];

  if (!targetSheet) {
    throw new Error('Файл не содержит листов');
  }

  const worksheet = workbook.Sheets[targetSheet];
  if (!worksheet) {
    throw new Error(`Лист «${targetSheet}» не найден`);
  }
  const jsonData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  if (jsonData.length === 0) {
    throw new Error('Таблица пуста');
  }

  // Первая строка — заголовки
  const headerRow = jsonData[0];
  const headers = headerRow.map((h, i) =>
    h != null ? String(h) : `Столбец ${i + 1}`
  );

  // Остальные строки — данные
  const rows: TableRow[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const rawRow = jsonData[i];
    const cells: Record<string, string | number | null> = {};

    headers.forEach((header, colIdx) => {
      const value = rawRow[colIdx] ?? null;
      cells[header] = value;
    });

    // Пропускаем полностью пустые строки
    const hasData = Object.values(cells).some((v) => v !== null && v !== '');
    if (hasData) {
      rows.push({ rowIndex: i, cells });
    }
  }

  // Автоопределение колонок
  const detectedNameColumn = detectColumn(headers, nameColumnKeywords);
  const detectedArticleColumn = detectColumn(headers, articleColumnKeywords);
  const detectedCategoryColumn = detectColumn(headers, categoryColumnKeywords);

  return {
    headers,
    rows,
    sheetName: targetSheet,
    totalRows: rows.length,
    detectedNameColumn,
    detectedArticleColumn,
    detectedCategoryColumn,
  };
}

/** Получить список имён листов из Excel-файла */
export function getSheetNames(buffer: ArrayBuffer, fileName?: string): string[] {
  const isCsv = fileName?.toLowerCase().endsWith('.csv');
  if (isCsv) return ['Sheet1'];

  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames;
}

/** Определить индекс колонки по ключевым словам */
function detectColumn(headers: string[], keywords: string[]): number | null {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const keyword of keywords) {
    const idx = normalizedHeaders.findIndex((h) => h === keyword);
    if (idx !== -1) return idx;
  }

  for (const keyword of keywords) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(keyword));
    if (idx !== -1) return idx;
  }

  return null;
}

/** Получить значение ячейки по индексу колонки */
export function getCellValue(row: TableRow, header: string): string {
  const value = row.cells[header];
  if (value == null) return '';
  return String(value);
}

/** Создать новый Excel-файл с хештегами */
export function createExcelWithHashtags(
  originalBuffer: ArrayBuffer,
  headers: string[],
  rows: TableRow[],
  hashtagColumnName: string
): ArrayBuffer {
  const workbook = XLSX.read(originalBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Определяем диапазон
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // Добавляем новый столбец
  const newColIdx = range.e.c + 1;
  const newColLetter = XLSX.utils.encode_col(newColIdx);

  // Записываем заголовок
  const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: newColIdx })];
  if (!headerCell) {
    worksheet[XLSX.utils.encode_cell({ r: 0, c: newColIdx })] = { t: 's', v: hashtagColumnName };
  } else {
    headerCell.v = hashtagColumnName;
    headerCell.t = 's';
  }

  // Записываем хештеги в строки
  for (const row of rows) {
    const excelRow = row.rowIndex;
    const cellRef = XLSX.utils.encode_cell({ r: excelRow, c: newColIdx });
    const hashtags = row.hashtags || '';
    worksheet[cellRef] = { t: 's', v: hashtags };
  }

  // Обновляем диапазон
  range.e.c = newColIdx;
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Генерируем буфер
  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return output;
}

/** Определить имя колонки для хештегов */
export function resolveHashtagColumnName(existingHeaders: string[]): string {
  if (!existingHeaders.includes('Хештеги')) {
    return 'Хештеги';
  }
  if (!existingHeaders.includes('Хештеги 2')) {
    return 'Хештеги 2';
  }
  let idx = 3;
  while (existingHeaders.includes(`Хештеги ${idx}`)) {
    idx++;
  }
  return `Хештеги ${idx}`;
}

/** Создать CSV-строку с хештегами */
export function createCsvWithHashtags(
  headers: string[],
  rows: TableRow[],
  hashtagColumnName: string
): string {
  const allHeaders = [...headers, hashtagColumnName];
  const lines: string[] = [allHeaders.map(escapeCsv).join(',')];

  for (const row of rows) {
    const values = allHeaders.map((header) => {
      let val: string | number | null;
      if (header === hashtagColumnName) {
        val = row.hashtags || '';
      } else {
        val = row.cells[header] ?? '';
      }
      return escapeCsv(String(val));
    });
    lines.push(values.join(','));
  }

  // BOM for Excel to recognize UTF-8
  return '\uFEFF' + lines.join('\n');
}

/** Экранирование значения для CSV */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
