'use client';

import React from 'react';

interface PizzaChartProps {
  percent: number; // 0-100
  size?: number;
  color?: string;
  label?: string;
}

export default function PizzaChart({ percent, size = 72, color = '#EAB308', label }: PizzaChartProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track (bagian kosong/belum dipelajari) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted"
            strokeWidth={8}
          />
          {/* Isian (bagian yang udah dipelajari) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{clamped}%</span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground text-center max-w-[90px] truncate">{label}</span>}
    </div>
  );
}
