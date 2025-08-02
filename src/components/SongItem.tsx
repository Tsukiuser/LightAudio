
'use client'

import { useContext } from 'react';
import Image from 'next/image';
import type { Song } from '@/lib/types';
import { MoreHorizontal, Music, ListPlus } from 'lucide-react';
import { Button } from './ui/button';
import { MusicContext } from '@/context/MusicContext';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';


interface SongItemProps {
  song: Song;
  queue?: Song[]; // Optional: The queue to set when this song is played
}

export function SongItem({ song, queue }: SongItemProps) {
  const musicContext = useContext(MusicContext);
  const isCurrentSong = musicContext?.currentSong?.id === song.id;
  const { toast } = useToast();

  const handlePlay = () => {
    musicContext?.playSong(song, queue);
  };

  const handleAddToQueue = () => {
    musicContext?.addToQueue(song);
    toast({
        title: "Added to queue",
        description: `"${song.title}" has been added to the queue.`,
    })
  }
  
  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors w-full group",
        isCurrentSong && "bg-primary/10 hover:bg-primary/20"
      )}
    >
      <div 
        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
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
      </div>
      <div className="hidden sm:block text-sm text-muted-foreground">{song.duration}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleAddToQueue}>
            <ListPlus className="mr-2 h-4 w-4" />
            Add to Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
