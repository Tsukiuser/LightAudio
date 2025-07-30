
'use client'

import { useContext } from 'react';
import Image from 'next/image';
import type { Song } from '@/lib/types';
import { MoreHorizontal, Music } from 'lucide-react';
import { Button } from './ui/button';
import { MusicContext } from '@/context/MusicContext';
import { cn } from '@/lib/utils';


interface SongItemProps {
  song: Song;
}

export function SongItem({ song }: SongItemProps) {
  const musicContext = useContext(MusicContext);
  const isCurrentSong = musicContext?.currentSong?.id === song.id;

  const handlePlay = () => {
    musicContext?.playSong(song);
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors w-full cursor-pointer",
        isCurrentSong && "bg-primary/10 hover:bg-primary/20"
      )}
      onClick={handlePlay}
    >
      <div className="relative">
        <Image
          src={song.coverArt}
          alt={`Cover for ${song.album}`}
          width={40}
          height={40}
          className="aspect-square rounded-md object-cover"
          data-ai-hint="album cover"
        />
        {isCurrentSong && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                <Music className="h-5 w-5 text-white" />
            </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium truncate", isCurrentSong ? "text-primary" : "text-foreground")}>{song.title}</p>
        <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
      </div>
      <div className="hidden sm:block text-sm text-muted-foreground">{song.duration}</div>
      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto flex-shrink-0" onClick={(e) => {e.stopPropagation(); console.log("More options")}}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
}
