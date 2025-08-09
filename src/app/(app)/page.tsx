
'use client'

import { useContext, useMemo } from 'react';
import { getAlbums } from '@/lib/music-utils';
import { AlbumCard } from '@/components/AlbumCard';
import { PageHeader } from '@/components/PageHeader';
import { MusicContext } from '@/context/MusicContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SongItem } from '@/components/SongItem';
import { Button } from '@/components/ui/button';
import { FolderSync, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const musicContext = useContext(MusicContext);
  const { toast } = useToast();
  const songs = musicContext?.songs || [];
  
  const albums = useMemo(() => getAlbums(songs), [songs]);
  const recentlyAddedAlbums = useMemo(() => [...albums].reverse(), [albums]);
  const recentlyAddedSongs = useMemo(() => [...songs].reverse().slice(0, 12), [songs]);

  const handleRescanFolder = async () => {
    await musicContext?.rescanMusic();
  }

  const handleChangeFolder = async () => {
    try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        toast({
            title: 'Folder Changed',
            description: 'Your music library is being updated in the background.',
        });
        await musicContext?.loadMusic(dirHandle);
    } catch (error) {
       console.error('Error accessing directory:', error);
       if (error instanceof DOMException && error.name === 'AbortError') {
         // Silently ignore abort errors
       } else {
        toast({
            title: 'Error',
            description: 'Could not access the music folder.',
            variant: 'destructive'
        })
       }
    }
  }

  if (musicContext?.isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-0">
        <PageHeader title="Home" />
        <section className="px-4 md:px-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recently Added Songs</h2>
           <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="px-4 md:px-6 mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recently Added Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (songs.length === 0 && !musicContext?.isScanning) {
    return (
      <div className="container mx-auto max-w-7xl px-0">
        <PageHeader title="Home" />
        <div className="flex flex-col items-center justify-center text-center p-8 mt-16">
          <h2 className="text-2xl font-bold mb-2">No Music Found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            We couldn't find any compatible audio files (.mp3, .flac, .m4a) in the selected folder.
            Please try rescanning or choose a different folder.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleRescanFolder} disabled={!musicContext?.hasAccess || musicContext?.isScanning}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Rescan Folder
            </Button>
            <Button onClick={handleChangeFolder} disabled={musicContext?.isScanning}>
              <FolderSync className="mr-2 h-4 w-4" />
              Change Folder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-7xl px-0 pb-8">
        <PageHeader title="Home">
            {musicContext?.isScanning && <div className="text-sm text-primary animate-pulse">Scanning...</div>}
        </PageHeader>

        <section className="px-2 md:px-4">
            <h2 className="text-xl font-semibold text-foreground mb-4 px-2">Recently Added Songs</h2>
            <div className="flex flex-col">
              {recentlyAddedSongs.map((song) => (
                <SongItem key={song.id} song={song} queue={recentlyAddedSongs} />
              ))}
            </div>
        </section>
        
        <section className="px-4 md:px-6 mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recently Added Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {recentlyAddedAlbums.map((album) => (
              <AlbumCard key={`${album.name}-${album.artist}`} album={album} />
            ))}
          </div>
        </section>

        <section className="px-4 md:px-6 mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">All Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {albums.map((album) => (
              <AlbumCard key={`${album.name}-${album.artist}`} album={album} />
            ))}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

    
