'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Shield, Sparkles, Hash, BookOpen, AlertCircle, Info,
  ChevronDown, ChevronUp, Wand2, RotateCcw, Download,
  CheckCircle2, Circle, Loader2, Moon, Sun, ClipboardList,
  FileSpreadsheet, FileText, Pencil, PencilOff, Search,
  Undo2, Filter, Rows3, Zap, Keyboard, Eye, PencilLine,
  Plus, Merge, Tag, Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import { FileUploader } from '@/components/marketplace/FileUploader';
import { ColumnSelector } from '@/components/marketplace/ColumnSelector';
import { PreviewTable } from '@/components/marketplace/PreviewTable';
import { ProcessingStats } from '@/components/marketplace/ProcessingStats';
import { ExportButton } from '@/components/marketplace/ExportButton';
import { CategorySelector } from '@/components/marketplace/CategorySelector';
import { ProductTypeSelector } from '@/components/marketplace/ProductTypeSelector';
import { LivePreview } from '@/components/marketplace/LivePreview';
import { RecentCategories, useRecentCategories } from '@/components/marketplace/RecentCategories';
import { DemoModeButton } from '@/components/marketplace/DemoModeButton';
import { CustomKeywordsInput } from '@/components/marketplace/CustomKeywordsInput';
import { HashtagAnalytics } from '@/components/marketplace/HashtagAnalytics';
import { SheetSelector } from '@/components/marketplace/SheetSelector';
import { BatchOperations } from '@/components/marketplace/BatchOperations';
import { ExportFormatSelector, formatHashtagsForExport, type ExportFormat } from '@/components/marketplace/ExportFormatSelector';
import { HashtagQualityScore } from '@/components/marketplace/HashtagQualityScore';
import { HashtagCloud } from '@/components/marketplace/HashtagCloud';

import { parseExcelFile, createExcelWithHashtags, createCsvWithHashtags, resolveHashtagColumnName, getCellValue, getSheetNames } from '@/lib/marketplace/excel';
import { DEFAULT_SETTINGS } from '@/lib/marketplace/hashtagGenerator';
import type { ParseResult, TableRow, ProcessingStats as Stats, GenerationSettings } from '@/lib/marketplace/types';
import { OZON_CATEGORIES, OzonCategory } from '@/lib/marketplace/ozonCategories';
import { generateHashtagsFromCategory, getCategoryGroup, getAdjacentCategories, getCategoryGroupHashtags } from '@/lib/marketplace/categoryUtils';
import { GenerationSettingsPanel } from '@/components/marketplace/GenerationSettingsPanel';

type Step = 'upload' | 'configure' | 'process' | 'done';

const STEPS: { key: Step; label: string; num: number; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Загрузка', num: 1, icon: Download },
  { key: 'configure', label: 'Настройка', num: 2, icon: Search },
  { key: 'process', label: 'Генерация', num: 3, icon: Wand2 },
  { key: 'done', label: 'Результат', num: 4, icon: CheckCircle2 },
];

function getStepIndex(step: Step): number {
  return STEPS.findIndex((s) => s.key === step);
}

/** Undo history entry */
interface UndoEntry {
  rows: TableRow[];
  description: string;
}

const MAX_UNDO_HISTORY = 50;

const ROW_COUNT_OPTIONS = [5, 8, 10, 20, 50] as const;

export default function HomePage() {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedNameColumn, setSelectedNameColumn] = useState<string>('');
  const [selectedArticleColumn, setSelectedArticleColumn] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [processedRows, setProcessedRows] = useState<TableRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [hashtagColumnName, setHashtagColumnName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedOzonCategory, setSelectedOzonCategory] = useState<OzonCategory | null>(null);
  const [selectedOzonCategoryId, setSelectedOzonCategoryId] = useState<string | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const { recent: recentCategories, record: recordRecentCategory, clear: clearRecentCategories } = useRecentCategories();
  const [isDark, setIsDark] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRows, setMaxRows] = useState(8);
  const [undoHistory, setUndoHistory] = useState<UndoEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [exportFormat, setExportFormat] = useState<ExportFormat>('default');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [keywordPreview, setKeywordPreview] = useState<string[]>([]);
  const [editingHashtag, setEditingHashtag] = useState<{ rowIdx: number; tagIdx: number } | null>(null);
  const [mergeOnRegen, setMergeOnRegen] = useState(false);
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [showGenSettings, setShowGenSettings] = useState(false);

  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generateRef = useRef<() => void>(() => {});

  // Persist dark mode in localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Keyboard shortcuts: Ctrl+Z for undo, Ctrl+F for search, Ctrl+G for generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setUndoHistory((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setProcessedRows(last.rows);
          toast({
            title: 'Отмена',
            description: last.description,
          });
          return prev.slice(0, -1);
        });
      }
      // Ctrl+F / Cmd+F: Toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && currentStep === 'done') {
        e.preventDefault();
        setShowSearch((prev) => {
          if (!prev) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
          } else {
            setSearchQuery('');
          }
          return !prev;
        });
      }
      // Ctrl+G / Cmd+G: Generate hashtags
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && currentStep !== 'upload' && !isProcessing && selectedNameColumn) {
        e.preventDefault();
        generateRef.current();
      }
      // Escape: Close search, edit mode, shortcuts dialog
      if (e.key === 'Escape') {
        // Don't interfere with native Select/Dialog components
        const target = e.target as HTMLElement;
        const isInsideSelect = target.closest('[role="combobox"]') || target.closest('[data-radix-popper-content-wrapper]');
        const isInsideDialog = target.closest('[role="dialog"]');
        if (isInsideSelect || isInsideDialog) return;
        
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else if (isEditMode) {
          setIsEditMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast, currentStep, isProcessing, selectedNameColumn, showSearch, isEditMode, showShortcuts]);

  const showError = useCallback((message: string) => {
    setError(message);
    toast({
      variant: 'destructive',
      title: 'Ошибка',
      description: message,
    });
  }, [toast]);

  const handleFileLoaded = useCallback((buffer: ArrayBuffer, name: string) => {
    setError(null);
    setFileBuffer(buffer);
    setFileName(name);

    try {
      // Get sheet names for multi-sheet selector
      const names = getSheetNames(buffer, name);
      setSheetNames(names);
      const defaultSheet = names[0] || '';
      setSelectedSheet(defaultSheet);

      const result = parseExcelFile(buffer, name, defaultSheet);
      setParseResult(result);

      const nameCol = result.detectedNameColumn !== null
        ? result.headers[result.detectedNameColumn]
        : result.headers[0] || '';
      setSelectedNameColumn(nameCol);

      if (result.detectedArticleColumn !== null) {
        setSelectedArticleColumn(result.headers[result.detectedArticleColumn]);
      } else {
        setSelectedArticleColumn('');
      }

      setCurrentStep('configure');
      setIsEditMode(false);
      setProcessedRows([]);
      setStats(null);
      setUndoHistory([]);
      setShowSearch(false);

      toast({
        title: 'Файл загружен',
        description: `${name} — ${result.totalRows} строк, лист «${result.sheetName}»${names.length > 1 ? ` (${names.length} листов)` : ''}`,
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка при чтении файла');
    }
  }, [showError, toast]);

  const handleGenerate = useCallback(() => {
    if (!parseResult || !selectedNameColumn) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep('process');

    setTimeout(() => {
      try {
        const newHashtagCol = resolveHashtagColumnName(parseResult.headers);
        setHashtagColumnName(newHashtagCol);

        let rowsWithHashtags = 0;
        let skippedRows = 0;
        let errorCount = 0;
        const errorMessages: string[] = [];

        const newRows: TableRow[] = parseResult.rows.map((row, idx) => {
          try {
            const nameValue = getCellValue(row, selectedNameColumn);

            if (!nameValue.trim()) {
              skippedRows++;
              return { ...row, hashtags: '' };
            }

            let hashtags: string;

            if (selectedOzonCategoryId) {
              // Ozon category mode — generate from category + product type + custom keywords
              const rawTags = generateHashtagsFromCategory(
                selectedOzonCategoryId,
                selectedProductType ?? undefined,
                customKeywords,
                nameValue
              );
              hashtags = rawTags.slice(0, generationSettings.targetHashtagCount || 30).join(' ');
            } else {
              // No category selected — generate from custom keywords only
              const tags = customKeywords.map(kw =>
                kw.startsWith('#') ? kw : '#' + kw.replace(/\s+/g, '').toLowerCase()
              ).filter(t => t.length > 2 && t.length <= 30);
              hashtags = tags.join(' ');
            }

            // Merge with existing hashtags if mergeOnRegen is enabled
            if (mergeOnRegen && processedRows[idx]?.hashtags && hashtags) {
              const existingTags = processedRows[idx].hashtags!.split(' ').filter(t => t.trim());
              const newTags = hashtags.split(' ').filter(t => t.trim());
              const merged = [...new Set([...existingTags, ...newTags])].slice(0, 30);
              hashtags = merged.join(' ');
            }

            if (hashtags) {
              rowsWithHashtags++;
            } else {
              skippedRows++;
            }

            return { ...row, hashtags };
          } catch (err) {
            errorCount++;
            const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
            errorMessages.push(`Строка ${row.rowIndex + 1}: ${msg}`);
            return { ...row, hashtags: '', error: msg };
          }
        });

        const newStats: Stats = {
          totalRows: parseResult.totalRows,
          processedRows: parseResult.totalRows,
          rowsWithHashtags,
          skippedRows,
          errors: errorCount,
          errorMessages,
        };

        setProcessedRows(newRows);
        setStats(newStats);
        setCurrentStep('done');
        setUndoHistory([]);

        if (rowsWithHashtags > 0 && skippedRows === 0 && errorCount === 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }

        toast({
          title: 'Хештеги сгенерированы',
          description: `${rowsWithHashtags} из ${parseResult.totalRows} строк получили хештеги`,
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Ошибка при генерации хештегов');
        setCurrentStep('configure');
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  }, [parseResult, selectedNameColumn, customKeywords, mergeOnRegen, processedRows, generationSettings, showError, toast, selectedOzonCategoryId, selectedProductType]);

  // Keep ref in sync for keyboard shortcut usage
  generateRef.current = handleGenerate;

  const handleExportXlsx = useCallback(async () => {
    if (!fileBuffer || !parseResult || !hashtagColumnName) return;

    // Apply export format to processed rows
    const formattedRows = processedRows.map(row => ({
      ...row,
      hashtags: formatHashtagsForExport(row.hashtags || '', exportFormat),
    }));

    // For CSV-origin files, we need to build a workbook from scratch
    let outputBuffer: ArrayBuffer;
    const isCsvSource = fileName.toLowerCase().endsWith('.csv');

    if (isCsvSource) {
      // Build workbook from processed data for CSV source files
      const XLSX = await import('xlsx');
      const allHeaders = [...parseResult.headers, hashtagColumnName];
      const data = [allHeaders];
      for (const row of formattedRows) {
        const rowData = allHeaders.map((h) => {
          if (h === hashtagColumnName) return row.hashtags || '';
          return row.cells[h] ?? '';
        });
        data.push(rowData);
      }
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, parseResult.sheetName);
      outputBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    } else {
      outputBuffer = createExcelWithHashtags(
        fileBuffer,
        parseResult.headers,
        formattedRows,
        hashtagColumnName
      );
    }

    const blob = new Blob([outputBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.(xlsx|xls|csv)$/i, '') + '_hashtagged.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Excel-файл скачан',
      description: `${fileName.replace(/\.(xlsx|xls|csv)$/i, '')}_hashtagged.xlsx`,
    });
  }, [fileBuffer, parseResult, processedRows, hashtagColumnName, fileName, exportFormat, toast]);

  const handleExportCsv = useCallback(() => {
    if (!parseResult || !hashtagColumnName) return;

    // Apply export format
    const formattedRows = processedRows.map(row => ({
      ...row,
      hashtags: formatHashtagsForExport(row.hashtags || '', exportFormat),
    }));

    const csvContent = createCsvWithHashtags(
      parseResult.headers,
      formattedRows,
      hashtagColumnName
    );

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.(xlsx|xls|csv)$/i, '') + '_hashtagged.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV-файл скачан',
      description: `${fileName.replace(/\.(xlsx|xls|csv)$/i, '')}_hashtagged.csv`,
    });
  }, [parseResult, processedRows, hashtagColumnName, fileName, exportFormat, toast]);

  const handleBulkCopy = useCallback(async () => {
    const allHashtags = processedRows
      .map((row) => row.hashtags || '')
      .filter((h) => h.trim().length > 0)
      .join('\n');

    if (!allHashtags) return;

    try {
      await navigator.clipboard.writeText(allHashtags);
      toast({
        title: 'Все хештеги скопированы',
        description: `${stats?.rowsWithHashtags || 0} строк скопировано в буфер обмена`,
      });
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = allHashtags;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: 'Все хештеги скопированы',
        description: `${stats?.rowsWithHashtags || 0} строк скопировано в буфер обмена`,
      });
    }
  }, [processedRows, stats, toast]);

  const toggleDarkMode = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFileBuffer(null);
    setFileName('');
    setParseResult(null);
    setSelectedNameColumn('');
    setSelectedArticleColumn('');
    setIsProcessing(false);
    setCurrentStep('upload');
    setProcessedRows([]);
    setStats(null);
    setHashtagColumnName('');
    setError(null);
    setIsEditMode(false);
    setSearchQuery('');
    setUndoHistory([]);
    setShowSearch(false);
    setSheetNames([]);
    setSelectedSheet('');
    setShowConfetti(false);
    setSelectedRows(new Set());
    setExportFormat('default');
    setMergeOnRegen(false);
    setGenerationSettings(DEFAULT_SETTINGS);
    setShowGenSettings(false);
  }, []);

  const handleSheetChange = useCallback((sheet: string) => {
    if (!fileBuffer || sheet === selectedSheet) return;

    try {
      setSelectedSheet(sheet);
      const result = parseExcelFile(fileBuffer, fileName, sheet);
      setParseResult(result);

      const nameCol = result.detectedNameColumn !== null
        ? result.headers[result.detectedNameColumn]
        : result.headers[0] || '';
      setSelectedNameColumn(nameCol);

      if (result.detectedArticleColumn !== null) {
        setSelectedArticleColumn(result.headers[result.detectedArticleColumn]);
      } else {
        setSelectedArticleColumn('');
      }

      setIsEditMode(false);
      setProcessedRows([]);
      setStats(null);
      setUndoHistory([]);
      setShowSearch(false);

      toast({
        title: 'Лист переключён',
        description: `Лист «${sheet}» — ${result.totalRows} строк`,
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Ошибка при чтении листа');
    }
  }, [fileBuffer, fileName, selectedSheet, showError, toast]);

  const pushUndo = useCallback((description: string) => {
    setUndoHistory((prev) => {
      const entry: UndoEntry = { rows: processedRows.map(r => ({ ...r })), description };
      const next = [...prev, entry];
      return next.slice(-MAX_UNDO_HISTORY);
    });
  }, [processedRows]);

  // Batch operation handlers
  const handleToggleRow = useCallback((idx: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedRows(new Set(processedRows.map((_, i) => i)));
  }, [processedRows]);

  const handleDeselectAll = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const handleBatchAddHashtag = useCallback((hashtag: string, indices: number[]) => {
    pushUndo(`Добавление ${hashtag} к ${indices.length} строкам`);
    setProcessedRows((prev) => {
      return prev.map((row, idx) => {
        if (!indices.includes(idx) || !row.hashtags) return row;
        const tags = row.hashtags.split(' ').filter(t => t.trim());
        if (tags.length >= 30) return row;
        if (tags.includes(hashtag)) return row;
        return { ...row, hashtags: [...tags, hashtag].join(' ') };
      });
    });
    toast({ title: 'Хештег добавлен', description: `${hashtag} → ${indices.length} строк` });
  }, [pushUndo, toast]);

  const handleBatchRemoveHashtag = useCallback((hashtag: string, indices: number[]) => {
    pushUndo(`Удаление ${hashtag} из ${indices.length} строк`);
    setProcessedRows((prev) => {
      return prev.map((row, idx) => {
        if (!indices.includes(idx) || !row.hashtags) return row;
        const tags = row.hashtags.split(' ').filter(t => t !== hashtag);
        return { ...row, hashtags: tags.join(' ') };
      });
    });
    toast({ title: 'Хештег удалён', description: `${hashtag} ← ${indices.length} строк` });
  }, [pushUndo, toast]);

  const handleUndo = useCallback(() => {
    setUndoHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setProcessedRows(last.rows);
      toast({
        title: 'Отмена',
        description: last.description,
      });
      return prev.slice(0, -1);
    });
  }, [toast]);

  const handleRemoveHashtag = useCallback((rowIndex: number, tagIndex: number) => {
    setProcessedRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      if (!row || !row.hashtags) return prev;

      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      if (tagIndex < 0 || tagIndex >= tags.length) return prev;

      const removedTag = tags[tagIndex];
      pushUndo(`Удаление хештега ${removedTag}`);

      tags.splice(tagIndex, 1);
      newRows[rowIndex] = { ...row, hashtags: tags.join(' ') };
      return newRows;
    });

    toast({
      title: 'Хештег удалён',
      description: 'Ctrl+Z для отмены',
    });
  }, [pushUndo, toast]);

  const handleEditHashtag = useCallback((rowIndex: number, tagIndex: number, newValue: string) => {
    setProcessedRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      if (!row || !row.hashtags) return prev;

      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      if (tagIndex < 0 || tagIndex >= tags.length) return prev;

      const oldValue = tags[tagIndex];
      pushUndo(`Замена хештега ${oldValue} → ${newValue}`);

      tags[tagIndex] = newValue;
      newRows[rowIndex] = { ...row, hashtags: tags.join(' ') };
      return newRows;
    });

    toast({
      title: 'Хештег изменён',
      description: 'Ctrl+Z для отмены',
    });
  }, [pushUndo, toast]);

  const handleReorderHashtag = useCallback((rowIndex: number, fromIndex: number, toIndex: number) => {
    pushUndo(`Перемещение хештега`);

    setProcessedRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      if (!row || !row.hashtags) return prev;

      const tags = row.hashtags.split(' ').filter((t) => t.trim().length > 0);
      if (fromIndex < 0 || fromIndex >= tags.length || toIndex < 0 || toIndex >= tags.length) return prev;

      const [moved] = tags.splice(fromIndex, 1);
      tags.splice(toIndex, 0, moved);
      newRows[rowIndex] = { ...row, hashtags: tags.join(' ') };
      return newRows;
    });
  }, [pushUndo]);

  const handleAddHashtagToRow = useCallback((rowIndex: number, newTag: string) => {
    let tag = newTag.trim();
    if (!tag.startsWith('#')) tag = '#' + tag;
    if (tag.length <= 1) return;

    pushUndo(`Добавление хештега ${tag}`);

    setProcessedRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      if (!row) return prev;

      const existingTags = (row.hashtags || '').split(' ').filter(t => t.trim());
      if (existingTags.length >= 30) return prev;
      if (existingTags.includes(tag)) return prev;

      newRows[rowIndex] = { ...row, hashtags: [...existingTags, tag].join(' ') };
      return newRows;
    });

    toast({
      title: 'Хештег добавлен',
      description: `${tag} — Ctrl+Z для отмены`,
    });
  }, [pushUndo, toast]);

  const previewRows = useMemo(() => {
    let rows;
    if (currentStep === 'done') {
      rows = processedRows.map((row) => {
        const cells: Record<string, string | number | null> = { ...row.cells };
        if (row.hashtags) cells[hashtagColumnName] = row.hashtags;
        return cells;
      });
    } else {
      rows = parseResult?.rows.map((r) => r.cells) || [];
    }

    // Apply search filter
    if (searchQuery.trim() && currentStep === 'done') {
      const q = searchQuery.toLowerCase().trim();
      return rows.filter((row) => {
        return Object.values(row).some((val) => {
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    return rows;
  }, [currentStep, processedRows, parseResult, hashtagColumnName, searchQuery]);

  /** Sample product name (first non-empty row) for live preview */
  const sampleProductName = useMemo(() => {
    if (!parseResult || !selectedNameColumn) return undefined;
    for (const row of parseResult.rows) {
      const val = getCellValue(row, selectedNameColumn);
      if (val.trim()) return val.trim();
    }
    return undefined;
  }, [parseResult, selectedNameColumn]);

  const processedRowIndices = useMemo(() => {
    // When search is active, we need to map filtered indices back to processedRows
    if (searchQuery.trim() && currentStep === 'done') {
      const q = searchQuery.toLowerCase().trim();
      return processedRows
        .map((row, idx) => {
          const allVals = Object.values(row.cells).map(v => v == null ? '' : String(v)).join(' ');
          const hashtagVal = row.hashtags || '';
          return (allVals.toLowerCase().includes(q) || hashtagVal.toLowerCase().includes(q)) ? idx : -1;
        })
        .filter(idx => idx >= 0);
    }
    return processedRows.map((_, idx) => idx);
  }, [processedRows, searchQuery, currentStep]);

  const currentStepIdx = getStepIndex(currentStep);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/30 via-background to-teal-50/20 dark:from-emerald-950/10 dark:via-background dark:to-teal-950/5 relative">
        {/* Confetti animation on success */}
        {showConfetti && <ConfettiOverlay />}

        {/* Keyboard shortcuts overlay */}
        {showShortcuts && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowShortcuts(false)}
          >
            <Card
              className="w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-emerald-500" />
                  Горячие клавиши
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ShortcutRow keys="Ctrl+Z" description="Отменить последнее действие" />
                <ShortcutRow keys="Ctrl+F" description="Поиск по хештегам и данным" />
                <ShortcutRow keys="Ctrl+G" description="Сгенерировать хештеги" />
                <ShortcutRow keys="Esc" description="Закрыть поиск / редактирование" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subtle animated background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-emerald-200/10 dark:bg-emerald-800/5 blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-200/10 dark:bg-teal-800/5 blur-3xl animate-float-slow" />
          <div className="absolute top-1/3 left-1/4 h-60 w-60 rounded-full bg-purple-200/5 dark:bg-purple-800/3 blur-3xl animate-float [animation-delay:2s]" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-rose-200/5 dark:bg-rose-800/3 blur-3xl animate-float-slow [animation-delay:3s]" />
        </div>

        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-10 shadow-sm relative">
          {/* Subtle gradient accent line at bottom */}
          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-emerald-300/50 animate-pulse-glow">
                <Hash className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-extrabold text-foreground leading-tight tracking-tight">
                  SEO-генератор хештегов
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                    Ozon
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400 transition-colors hover:bg-violet-50 dark:hover:bg-violet-950/30">
                    Wildberries
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    Яндекс Маркет
                  </Badge>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {/* Undo button */}
                {undoHistory.length > 0 && currentStep === 'done' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleUndo}
                        className="h-9 w-9 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-200 text-purple-600 dark:text-purple-400"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отменить (Ctrl+Z) — {undoHistory.length} действий</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleDarkMode}
                      className="h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                    >
                      {isDark ? (
                        <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 hover:rotate-45" />
                      ) : (
                        <Moon className="h-4 w-4 text-muted-foreground transition-transform duration-300 hover:-rotate-12" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isDark ? 'Светлая тема' : 'Тёмная тема'}</p>
                  </TooltipContent>
                </Tooltip>
                {/* Keyboard shortcuts help */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowShortcuts(!showShortcuts)}
                      className="h-9 w-9 rounded-lg hover:bg-muted transition-all duration-200"
                    >
                      <Keyboard className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Горячие клавиши</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => {
                const isActive = currentStep === step.key;
                const isCompleted = currentStepIdx > idx;
                const isPending = currentStepIdx < idx;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`
                          h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center
                          transition-all duration-500 ease-out
                          ${isCompleted
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/50'
                            : isActive
                            ? 'bg-gradient-to-br from-emerald-500 to-cyan-600 text-white shadow-lg shadow-emerald-300/50 dark:shadow-emerald-900/50 ring-4 ring-emerald-100 dark:ring-emerald-900/50 scale-110 animate-pulse-subtle'
                            : isPending
                            ? 'bg-muted/60 text-muted-foreground/50 scale-95'
                            : 'bg-muted text-muted-foreground'
                          }
                        `}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : isActive && isProcessing ? (
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        ) : (
                          <StepIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs font-semibold transition-colors duration-300 ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isCompleted
                            ? 'text-emerald-600/70 dark:text-emerald-400/70'
                            : 'text-muted-foreground/60'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`
                          flex-1 h-1 mx-2 sm:mx-4 mt-[-1.125rem] sm:mt-[-1.375rem] rounded-full
                          transition-all duration-500
                          ${currentStepIdx > idx
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-200/50'
                            : 'bg-muted-foreground/10'
                          }
                        `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hero Card - only visible on upload step */}
          {currentStep === 'upload' && (
            <section className="mb-8 animate-in fade-in duration-500">
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 text-white overflow-hidden relative animate-gradient">
                {/* Animated mesh decorative elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/8 animate-float" />
                  <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-white/6 animate-float-slow" />
                  <div className="absolute right-1/4 top-1/3 h-20 w-20 rounded-full bg-white/4 animate-float [animation-delay:1s]" />
                  <div className="absolute left-1/3 bottom-1/4 h-16 w-16 rounded-full bg-white/4 animate-float-slow [animation-delay:2s]" />
                  <div className="absolute right-2/3 top-1/6 h-10 w-10 rounded-full bg-white/5 animate-float [animation-delay:3s]" />
                  <div className="absolute left-1/2 bottom-1/3 h-14 w-14 rounded-full bg-white/3 animate-float [animation-delay:4s]" />
                  {/* Subtle grid pattern overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]" />
                </div>
                <CardContent className="p-6 sm:p-8 relative">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-md shadow-lg shadow-black/10 border border-white/10">
                      <Wand2 className="h-7 w-7 text-white drop-shadow-sm" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight drop-shadow-sm">
                        Автоматическая генерация хештегов
                      </h2>
                      <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed max-w-xl">
                        Загрузите Excel-файл с наименованиями товаров. Сервис добавит столбец с релевантными хештегами и вернёт готовую таблицу.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 text-emerald-100 text-xs sm:text-sm bg-white/12 rounded-lg px-3 py-2 backdrop-blur-md border border-white/10 shadow-sm">
                          <Shield className="h-3.5 w-3.5" />
                          Файл обрабатывается в браузере
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-100 text-xs sm:text-sm bg-white/12 rounded-lg px-3 py-2 backdrop-blur-md border border-white/10 shadow-sm">
                          <Sparkles className="h-3.5 w-3.5" />
                          Без GPT и API
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-100 text-xs sm:text-sm bg-white/12 rounded-lg px-3 py-2 backdrop-blur-md border border-white/10 shadow-sm">
                          <Zap className="h-3.5 w-3.5" />
                          614 категорий Ozon + смежные
                        </div>
                      </div>
                      {/* Stats strip */}
                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl">
                        {[
                          { num: '614', label: 'категорий Ozon', icon: Tag },
                          { num: '9 328', label: 'типов товаров', icon: Boxes },
                          { num: '9', label: 'форматов экспорта', icon: FileSpreadsheet },
                          { num: '100%', label: 'в браузере, без сервера', icon: Shield },
                        ].map((stat, i) => {
                          const StatIcon = stat.icon;
                          return (
                            <div
                              key={i}
                              className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-md border border-white/10 flex items-center gap-2.5 hover:bg-white/15 transition-colors duration-300 animate-count-up"
                              style={{ animationDelay: `${i * 80}ms` }}
                            >
                              <StatIcon className="h-4 w-4 text-emerald-100/80 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-base sm:text-lg font-extrabold text-white leading-none tabular-nums">
                                  {stat.num}
                                </div>
                                <div className="text-[10px] text-emerald-100/70 mt-0.5 truncate">
                                  {stat.label}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: File Upload */}
          <section className="mb-6">
            <FileUploader onFileLoaded={handleFileLoaded} onError={showError} isProcessing={isProcessing} />

            {/* Demo button */}
            {currentStep === 'upload' && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-muted-foreground/10" />
                <span className="text-xs text-muted-foreground">или</span>
                <div className="h-px flex-1 bg-muted-foreground/10" />
              </div>
            )}
            {currentStep === 'upload' && (
              <div className="mt-3 flex justify-center">
                <DemoModeButton onLoadDemo={handleFileLoaded} />
              </div>
            )}
          </section>

          {/* Step 2: Configure */}
          {parseResult && currentStep !== 'upload' && (
            <section className="mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
              {/* File info & preset */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-gradient hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center text-sm">
                        ⚙️
                      </span>
                      Настройка
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        📄 <span className="font-medium text-foreground">{fileName}</span>
                      </span>
                      <span>•</span>
                      <span>Строк: <span className="font-medium text-foreground">{parseResult.totalRows}</span></span>
                      <span>•</span>
                      <span>Лист: <span className="font-medium text-foreground">{parseResult.sheetName}</span></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Recent categories quick-access (localStorage) */}
                  <RecentCategories
                    recent={recentCategories}
                    selectedCategoryId={selectedOzonCategoryId}
                    onCategoryChange={(id, cat) => {
                      setSelectedOzonCategoryId(id);
                      setSelectedOzonCategory(cat);
                      setSelectedProductType(null);
                      recordRecentCategory(id);
                    }}
                    onClear={clearRecentCategories}
                  />

                  {/* Category selector */}
                  <CategorySelector
                    selectedCategoryId={selectedOzonCategoryId}
                    onCategoryChange={(id, cat) => {
                      setSelectedOzonCategoryId(id);
                      setSelectedOzonCategory(cat);
                      setSelectedProductType(null);
                      recordRecentCategory(id);
                    }}
                  />

                  {/* Product type selector — appears once a category is chosen */}
                  {selectedOzonCategory && (
                    <ProductTypeSelector
                      category={selectedOzonCategory}
                      selectedProductType={selectedProductType}
                      onChange={setSelectedProductType}
                    />
                  )}

                  {/* Live preview — sample hashtags from current settings */}
                  <LivePreview
                    category={selectedOzonCategory}
                    productType={selectedProductType}
                    customKeywords={customKeywords}
                    targetCount={generationSettings.targetHashtagCount}
                    sampleName={sampleProductName}
                  />

                  {/* Sheet selector (only for multi-sheet files) */}
                  <SheetSelector
                    sheetNames={sheetNames}
                    selectedSheet={selectedSheet}
                    onSheetChange={handleSheetChange}
                  />

                  <Separator />

                  {/* Column selectors */}
                  <ColumnSelector
                    headers={parseResult.headers}
                    selectedColumn={selectedNameColumn}
                    onColumnChange={setSelectedNameColumn}
                    detectedColumn={parseResult.detectedNameColumn}
                    label="Колонка с наименованием:"
                    type="name"
                  />
                  <ColumnSelector
                    headers={parseResult.headers}
                    selectedColumn={selectedArticleColumn}
                    onColumnChange={setSelectedArticleColumn}
                    detectedColumn={parseResult.detectedArticleColumn}
                    label="Колонка с артикулом:"
                    type="article"
                  />

                  <Separator />

                  {/* Custom keywords */}
                  <CustomKeywordsInput
                    keywords={customKeywords}
                    onKeywordsChange={setCustomKeywords}
                  />

                  <Separator />

                  {/* Generation Settings */}
                  <Collapsible open={showGenSettings} onOpenChange={setShowGenSettings}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 group">
                      <span className="h-5 w-5 rounded-md bg-gradient-to-br from-teal-100 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 flex items-center justify-center text-[10px]">
                        ⚡
                      </span>
                      Настройки генерации
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-3.5 border-teal-200 text-teal-600 dark:border-teal-800 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20">
                        {generationSettings.targetHashtagCount} шт.
                      </Badge>
                      <ChevronDown className="h-3.5 w-3.5 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <GenerationSettingsPanel
                        settings={generationSettings}
                        onSettingsChange={setGenerationSettings}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Export format selector */}
                  <ExportFormatSelector
                    value={exportFormat}
                    onChange={setExportFormat}
                  />

                  {/* Merge on regenerate toggle */}
                  {currentStep === 'done' && (
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={mergeOnRegen}
                          onChange={(e) => setMergeOnRegen(e.target.checked)}
                          className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-300 dark:border-purple-700 accent-purple-600 transition-colors"
                        />
                        <Merge className="h-3.5 w-3.5 text-purple-500 group-hover:text-purple-700 transition-colors" />
                        <span>Объединить с существующими хештегами при перегенерации</span>
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className={`shadow-sm hover:shadow-md transition-all duration-300 ${isEditMode ? 'ring-2 ring-purple-200 dark:ring-purple-800/50 border-purple-200 dark:border-purple-800/50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 flex items-center justify-center text-sm">
                        👁
                      </span>
                      Предпросмотр данных
                      {isEditMode && (
                        <Badge variant="outline" className="text-xs border-purple-300 text-purple-600 dark:border-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 animate-in zoom-in-50 duration-200">
                          ✏️ Редактирование
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {/* Search toggle */}
                      {currentStep === 'done' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={showSearch ? "default" : "ghost"}
                              size="icon"
                              onClick={() => {
                                setShowSearch(!showSearch);
                                if (!showSearch) {
                                  setTimeout(() => searchInputRef.current?.focus(), 100);
                                } else {
                                  setSearchQuery('');
                                }
                              }}
                              className={`h-8 w-8 rounded-lg transition-all duration-200 ${
                                showSearch
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                                  : 'hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              <Search className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{showSearch ? 'Скрыть поиск' : 'Поиск по хештегам и данным'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {/* Edit mode toggle */}
                      {currentStep === 'done' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={isEditMode ? "default" : "outline"}
                              size="sm"
                              onClick={() => setIsEditMode(!isEditMode)}
                              className={`gap-1.5 h-8 text-xs transition-all duration-200 ${
                                isEditMode 
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' 
                                  : 'hover:border-purple-300 hover:text-purple-600'
                              }`}
                            >
                              {isEditMode ? (
                                <>
                                  <PencilOff className="h-3.5 w-3.5" />
                                  Завершить
                                </>
                              ) : (
                                <>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Редактировать
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isEditMode ? 'Выйти из режима редактирования' : 'Редактировать хештеги: удалить, изменить (2× клик), добавить, перемещать'}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {/* Row count selector */}
                      <div className="flex items-center gap-1 ml-1">
                        <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
                        {ROW_COUNT_OPTIONS.map((opt) => (
                          <Button
                            key={opt}
                            variant={maxRows === opt ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setMaxRows(opt)}
                            className={`h-7 px-2 text-[11px] transition-all duration-200 ${
                              maxRows === opt
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Search bar */}
                  {showSearch && currentStep === 'done' && (
                    <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={searchInputRef}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Поиск по хештегам, наименованиям..."
                          className="pl-9 h-9 text-sm border-purple-200 dark:border-purple-800 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-700"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <span className="text-xs">✕</span>
                          </Button>
                        )}
                      </div>
                      {searchQuery && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          <Filter className="h-3 w-3 inline mr-1" />
                          Найдено: {previewRows.length} из {processedRows.length} строк
                        </p>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {/* Batch operations (only in done step) — sticky below header */}
                  {currentStep === 'done' && (
                    <div className="mb-3 sticky top-[60px] sm:top-[68px] z-20 bg-card py-2 -mx-1 px-1 rounded-lg">
                      <BatchOperations
                        totalRows={processedRows.length}
                        selectedRows={selectedRows}
                        onToggleRow={handleToggleRow}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                        onAddHashtag={handleBatchAddHashtag}
                        onRemoveHashtag={handleBatchRemoveHashtag}
                      />
                    </div>
                  )}
                  <PreviewTable
                    headers={parseResult.headers}
                    rows={previewRows}
                    nameColumn={selectedNameColumn}
                    hashtagColumn={currentStep === 'done' ? hashtagColumnName : undefined}
                    maxRows={maxRows}
                    editable={isEditMode}
                    onRemoveHashtag={isEditMode ? handleRemoveHashtag : undefined}
                    onEditHashtag={isEditMode ? handleEditHashtag : undefined}
                    onAddHashtag={isEditMode ? handleAddHashtagToRow : undefined}
                    onReorderHashtag={isEditMode ? handleReorderHashtag : undefined}
                    processedRowIndices={processedRowIndices}
                    selectable={currentStep === 'done'}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    showSuggestions={currentStep === 'done'}
                    categoryId={selectedOzonCategoryId ?? undefined}
                    productType={selectedProductType ?? selectedOzonCategory?.productTypes?.[0]}
                    customKeywords={customKeywords}
                    targetHashtagCount={generationSettings.targetHashtagCount}
                  />
                </CardContent>
              </Card>
            </section>
          )}

          {/* Action Buttons */}
          {parseResult && currentStep !== 'upload' && (
            <section className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || !selectedNameColumn}
                  size="lg"
                  className={`
                    gap-2 flex-1 sm:flex-none transition-all duration-300 ripple-btn
                    ${currentStep === 'done'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200/50 dark:shadow-amber-900/30'
                      : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 hover:shadow-xl glow-emerald btn-shimmer'
                    }
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Генерация...
                    </>
                  ) : currentStep === 'done' ? (
                    <>
                      <RotateCcw className="h-5 w-5" />
                      Перегенерировать
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Сгенерировать хештеги
                    </>
                  )}
                </Button>

                {currentStep === 'done' && (
                  <>
                    <ExportButton
                      onClick={handleExportXlsx}
                      disabled={false}
                      fileName={fileName.replace(/\.(xlsx|xls|csv)$/i, '') + '_hashtagged.xlsx'}
                    />
                    <Button
                      onClick={handleExportCsv}
                      variant="outline"
                      size="lg"
                      className="gap-2 flex-1 sm:flex-none hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
                    >
                      <FileText className="h-5 w-5" />
                      Скачать CSV
                    </Button>
                    <Button
                      onClick={handleBulkCopy}
                      variant="outline"
                      size="lg"
                      className="gap-2 flex-1 sm:flex-none hover:border-purple-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                    >
                      <ClipboardList className="h-5 w-5" />
                      Копировать все
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={handleReset}
                  size="lg"
                  className="gap-2 hover:border-destructive/30 hover:text-destructive transition-all duration-200"
                >
                  Начать заново
                </Button>
              </div>
            </section>
          )}

          {/* Stats */}
          {stats && currentStep === 'done' && (
            <section className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ProcessingStats stats={stats} />
            </section>
          )}

          {/* Analytics */}
          {stats && currentStep === 'done' && processedRows.length > 0 && (
            <section className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '150ms' }}>
              <HashtagAnalytics
                processedRows={processedRows}
                nameColumn={selectedNameColumn}
              />
            </section>
          )}

          {/* Hashtag Cloud */}
          {stats && currentStep === 'done' && processedRows.length > 0 && (
            <section className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '250ms' }}>
              <HashtagCloud
                processedRows={processedRows}
              />
            </section>
          )}

          {/* Information Sections */}
          <section className="mt-12 space-y-2">
            <Separator className="mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <InfoCard
                icon={<BookOpen className="h-5 w-5" />}
                title="Как пользоваться"
                color="emerald"
                items={[
                  'Загрузите файл (.xlsx, .xls или .csv) с наименованиями товаров',
                  'Выберите лист таблицы (для многостраничных Excel)',
                  'Выберите категорию Ozon (614 категорий с поиском) или пресет',
                  'Настройте минимум/максимум хештегов (по умолчанию 10–30)',
                  'Включите русский приоритет и смежные категории',
                  'Добавьте свои ключевые слова при необходимости',
                  'Выберите колонку с наименованием (определяется автоматически)',
                  'Нажмите «Сгенерировать хештеги»',
                  'Отредактируйте результат при необходимости (Ctrl+Z для отмены)',
                  'Используйте поиск для фильтрации по хештегам (Ctrl+F)',
                  'Изучите аналитику: частотность групп и топ хештегов',
                  'Горячие клавиши: Ctrl+G — генерация, Ctrl+F — поиск',
                  'Конструктор пресетов: создайте свои группы хештегов',
                  'Объединение хештегов при перегенерации (чекбокс)',
                  'Скачайте готовый файл или скопируйте хештеги',
                ]}
              />
              <InfoCard
                icon={<Hash className="h-5 w-5" />}
                title="Правила хештегов"
                color="purple"
                items={[
                  'Начинаются с #, только буквы, цифры и _',
                  'Длина — не более 30 символов',
                  'Не более 30 хештегов на строку',
                  'Русский приоритет: русские хештеги идут первыми',
                  'Английские допускаются: бренды (Ford, BMW) и популярные (love, kawaii)',
                  'Отражают: тренд, стиль, настроение, повод, аудиторию',
                  'Запрещены: бренды, размеры, артикулы, названия товаров',
                  'Минимум 10 хештегов — настраиваемый (от 1 до 30)',
                  'При минимуме 1 — выбирается самый популярный хештег',
                  'Можно удалить ненужные хештеги перед экспортом',
                  'Двойной клик на хештег — редактирование',
                  'Отмена изменений: Ctrl+Z или кнопка ↩ в шапке',
                  'Смежные категории добавляют хештеги по смыслу',
                  'Аналитика показывает частотность групп и топ хештегов',
                ]}
              />
              <InfoCard
                icon={<Shield className="h-5 w-5" />}
                title="Приватность"
                color="teal"
                items={[
                  'Файлы обрабатываются в браузере',
                  'Данные не отправляются на сервер',
                  'Без GPT, OpenAI и платных API',
                  'Генерация на словарях и правилах',
                  'Поддержка Excel и CSV',
                  'Настройка тёмной темы сохраняется',
                  '614 категорий Ozon: от пледов до автозапчастей, с поиском и смежными категориями',
                ]}
              />
            </div>

            {/* Supported themes */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 group">
                <Info className="h-4 w-4" />
                {selectedOzonCategory
                  ? `Категория Ozon: ${selectedOzonCategory.name}${selectedProductType ? ` → ${selectedProductType}` : ''} (${selectedOzonCategory.productTypes.length} типов)`
                  : 'Выберите категорию Ozon'
                }
                <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-2 pb-4 pl-6">
                  {selectedOzonCategory ? (
                    selectedOzonCategory.productTypes.map((type, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      >
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Выберите категорию для просмотра типов товаров</span>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto bg-gradient-to-r from-background via-muted/30 to-background backdrop-blur-xl relative overflow-hidden">
          {/* Subtle decorative line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200/30 dark:shadow-emerald-900/30">
                  <Hash className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    Marketplace SEO Helper
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    генератор хештегов для маркетплейсов • v7
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-emerald-200/60 text-emerald-600/80 dark:border-emerald-800/60 dark:text-emerald-400/80 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Без backend
                </Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-violet-200/60 text-violet-600/80 dark:border-violet-800/60 dark:text-violet-400/80 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-colors">
                  Без API
                </Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-teal-200/60 text-teal-600/80 dark:border-teal-800/60 dark:text-teal-400/80 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-colors">
                  100% браузер
                </Badge>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 border-amber-200/60 text-amber-600/80 dark:border-amber-800/60 dark:text-amber-400/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  614 категорий Ozon
                </Badge>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

/** Карточка информации — используется в нижней секции */
function InfoCard({
  icon,
  title,
  color,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  color: 'emerald' | 'purple' | 'teal';
  items: string[];
}) {
  const [open, setOpen] = useState(false);

  const colorClasses = {
    emerald: {
      icon: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
      border: 'border-emerald-100 dark:border-emerald-900/50',
      dot: 'text-emerald-500',
      hoverShadow: 'hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/30',
      gradient: 'from-emerald-500/10 to-teal-500/5',
    },
    purple: {
      icon: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50/80 dark:bg-purple-950/20',
      border: 'border-purple-100 dark:border-purple-900/50',
      dot: 'text-purple-500',
      hoverShadow: 'hover:shadow-purple-100/50 dark:hover:shadow-purple-900/30',
      gradient: 'from-purple-500/10 to-pink-500/5',
    },
    teal: {
      icon: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/80 dark:bg-teal-950/20',
      border: 'border-teal-100 dark:border-teal-900/50',
      dot: 'text-teal-500',
      hoverShadow: 'hover:shadow-teal-100/50 dark:hover:shadow-teal-900/30',
      gradient: 'from-teal-500/10 to-cyan-500/5',
    },
  };

  const c = colorClasses[color];

  return (
    <Card className={`${c.border} ${c.bg} border shadow-sm hover:shadow-md ${c.hoverShadow} transition-all duration-300 relative overflow-hidden`}>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500`} />
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full relative">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={c.icon}>{icon}</span>
                <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 relative">
            <ul className="space-y-1.5">
              {items.map((item, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2 animate-in fade-in slide-in-from-left-1 duration-200" style={{ animationDelay: `${idx * 30}ms` }}>
                  <span className={`${c.dot} mt-0.5 shrink-0`}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Shortcut row for keyboard shortcuts dialog */
function ShortcutRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">
        {keys.split('+').map((key, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <span className="text-xs text-muted-foreground/50">+</span>}
            <kbd className="inline-flex items-center justify-center h-6 min-w-[28px] px-1.5 text-[11px] font-mono font-medium rounded-md border bg-muted/80 text-foreground shadow-sm">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Confetti overlay — appears on 100% success */
function ConfettiOverlay() {
  const confettiColors = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
  const particles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.5}s`,
      duration: `${1.5 + Math.random() * 2}s`,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: `${6 + Math.random() * 8}px`,
      rotation: `${Math.random() * 360}deg`,
    }))
  , []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}
