/** Одна строка таблицы после парсинга */
export interface TableRow {
  rowIndex: number;
  cells: Record<string, string | number | null>;
  hashtags?: string;
  error?: string;
}

/** Статистика обработки */
export interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  rowsWithHashtags: number;
  skippedRows: number;
  errors: number;
  errorMessages: string[];
}

/** Результат парсинга Excel-файла */
export interface ParseResult {
  headers: string[];
  rows: TableRow[];
  sheetName: string;
  totalRows: number;
  detectedNameColumn: number | null;
  detectedArticleColumn: number | null;
}

/** Результат валидации хештега */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Настройки генерации хештегов */
export interface GenerationSettings {
  /** Целевое количество хештегов (по умолчанию 10). При 1 — только самый популярный */
  targetHashtagCount: number;
  /** Максимальное количество хештегов (по умолчанию 30) */
  maxHashtagCount: number;
  /** Приоритет русского языка (по умолчанию true) */
  russianFirst: boolean;
  /** Использовать смежные категории (по умолчанию true) */
  useRelatedCategories: boolean;
}
