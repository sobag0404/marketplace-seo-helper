'use client';

import { useMemo } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HashtagQualityScoreProps {
  hashtags: string;
  maxTags?: number; // default 30
}

function calcCountScore(count: number, maxTags: number): number {
  // 0 tags = 0%, 1-10 = 33%, 11-20 = 66%, 21-30 = 100%
  if (count === 0) return 0;
  if (count <= 10) return 33;
  if (count <= 20) return 66;
  return 100;
}

function calcDiversityScore(tags: string[]): number {
  if (tags.length === 0) return 0;
  const stems = new Set(tags.map((tag) => tag.slice(0, 4).toLowerCase()));
  return Math.round((stems.size / tags.length) * 100);
}

function calcLengthScore(tags: string[]): number {
  if (tags.length === 0) return 0;
  const avgLen = tags.reduce((sum, t) => sum + t.length, 0) / tags.length;
  // Optimal range: 10-25 chars → 100%
  // Below 10: scale from 0 to 100
  // Above 25: scale down from 100 to 0
  if (avgLen >= 10 && avgLen <= 25) return 100;
  if (avgLen < 10) return Math.round((avgLen / 10) * 100);
  // avgLen > 25: degrade, reaching ~0 around 50 chars
  const over = avgLen - 25;
  return Math.round(Math.max(0, 100 - (over / 25) * 100));
}

function getScoreColor(score: number): string {
  if (score <= 40) return '#ef4444'; // red
  if (score <= 65) return '#f59e0b'; // amber
  if (score <= 80) return '#84cc16'; // yellow-green (lime)
  return '#22c55e'; // green
}

function getScoreRingTrack(): string {
  return 'rgba(0,0,0,0.1)';
}

export function HashtagQualityScore({
  hashtags,
  maxTags = 30,
}: HashtagQualityScoreProps) {
  const analysis = useMemo(() => {
    const tags = hashtags
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const countScore = calcCountScore(tags.length, maxTags);
    const diversityScore = calcDiversityScore(tags);
    const lengthScore = calcLengthScore(tags);

    const overall = Math.round(
      countScore * 0.4 + diversityScore * 0.3 + lengthScore * 0.3
    );

    return {
      count: tags.length,
      countScore,
      diversityScore,
      lengthScore,
      overall,
      color: getScoreColor(overall),
    };
  }, [hashtags, maxTags]);

  // SVG ring params
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (analysis.overall / 100) * circumference;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="relative inline-flex items-center justify-center align-middle cursor-default"
          aria-label={`Качество хештегов: ${analysis.overall}%`}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="rotate-[-90deg]"
          >
            {/* Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getScoreRingTrack()}
              strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={analysis.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <span
            className="absolute text-[9px] font-bold leading-none select-none"
            style={{ color: analysis.color }}
          >
            {analysis.overall}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        <span className="text-xs">
          Количество: {analysis.count}/{maxTags} &bull; Разнообразие:{' '}
          {analysis.diversityScore}% &bull; Длина: {analysis.lengthScore}%
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
