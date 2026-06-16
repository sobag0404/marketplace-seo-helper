'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, X, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  onError: (message: string) => void;
  isProcessing: boolean;
}

export function FileUploader({ onFileLoaded, onError, isProcessing }: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (!file) return;

      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExtensions.includes(ext)) {
        onError('Пожалуйста, загрузите файл формата .xlsx, .xls или .csv');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        onError('Файл слишком большой. Максимальный размер — 50 МБ');
        return;
      }

      setFileName(file.name);
      setFileSize(formatSize(file.size));
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        onFileLoaded(buffer, file.name);
      };
      reader.onerror = () => {
        onError('Не удалось прочитать файл. Попробуйте другой файл.');
      };
      reader.readAsArrayBuffer(file);
    },
    [onFileLoaded, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleReset = useCallback(() => {
    setFileName(null);
    setFileSize('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const fileExt = fileName ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center
          rounded-2xl border-2 border-dashed p-8 sm:p-12
          cursor-pointer transition-all duration-300 ease-out
          group
          ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 scale-[1.01] shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30'
              : fileName
              ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/10 hover:border-emerald-400'
              : 'border-muted-foreground/20 hover:border-emerald-400 hover:bg-muted/50 hover:shadow-md'
          }
          ${isProcessing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleInputChange}
          className="hidden"
        />

        {fileName ? (
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0 shadow-sm">
              {fileExt === '.csv' ? (
                <FileText className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileSpreadsheet className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground text-sm sm:text-base">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fileSize} • {fileExt === '.csv' ? 'CSV' : 'Excel'} • Нажмите или перетащите, чтобы заменить
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/80 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 shadow-sm">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm sm:text-base">
              Перетащите файл сюда
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              или нажмите, чтобы выбрать файл
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                .xlsx
              </Badge>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                .xls
              </Badge>
              <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                .csv
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-2 flex items-center gap-1">
              <FileWarning className="h-3 w-3" />
              Максимальный размер: 50 МБ
            </p>
          </>
        )}

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl pointer-events-none" />
        )}
      </div>

      {fileName && (
        <div className="mt-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="text-muted-foreground hover:text-destructive transition-colors duration-200"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Сбросить
          </Button>
        </div>
      )}
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${className}`}>
      {children}
    </span>
  );
}
