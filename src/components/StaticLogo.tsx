
'use client';

import { cn } from '@/lib/utils';
import { Music } from 'lucide-react';

export function StaticLogo({ className }: { className?: string }) {
  const barHeights = [40, 75, 50, 60, 30]; // Fixed heights for the bars
  
  return (
    <div className={cn("flex items-end justify-center h-6 w-6 gap-0.5", className)}>
      {barHeights.map((height, index) => (
        <div
          key={index}
          className="w-[3px] bg-primary rounded-full"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}
