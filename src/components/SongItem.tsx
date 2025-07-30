import Image from 'next/image';
import type { Song } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';

interface SongItemProps {
  song: Song;
}

export function SongItem({ song }: SongItemProps) {
  return (
    <div className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors w-full">
      <Image
        src={song.coverArt}
        alt={`Cover for ${song.album}`}
        width={40}
        height={40}
        className="aspect-square rounded-md object-cover"
        data-ai-hint="album cover"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-foreground">{song.title}</p>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>
      <div className="hidden sm:block text-sm text-muted-foreground">{song.duration}</div>
      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto flex-shrink-0">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}
