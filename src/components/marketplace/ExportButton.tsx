'use client';

import { Download, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  onClick: () => void;
  disabled: boolean;
  fileName?: string;
}

export function ExportButton({ onClick, disabled, fileName }: ExportButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="lg"
      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/50 transition-all duration-200 hover:shadow-xl flex-1 sm:flex-none"
    >
      <FileCheck className="h-5 w-5" />
      Скачать Excel
      {fileName && (
        <span className="text-emerald-200 text-[11px] font-normal hidden sm:inline">
          ({fileName})
        </span>
      )}
    </Button>
  );
}
