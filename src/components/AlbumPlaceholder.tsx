
import { StaticLogo } from './StaticLogo';
import { cn } from '@/lib/utils';

interface AlbumPlaceholderProps {
  className?: string;
}

export function AlbumPlaceholder({ className }: AlbumPlaceholderProps) {
  return (
    <div className={cn("aspect-square w-full bg-muted flex items-center justify-center", className)}>
      <StaticLogo className="h-1/3 w-1/3 text-muted-foreground/50" />
    </div>
  );
}
