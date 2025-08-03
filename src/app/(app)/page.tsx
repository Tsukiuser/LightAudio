
'use client'

import { useContext } from 'react';
import { getAlbums } from '@/lib/music-utils';
import { AlbumCard } from '@/components/AlbumCard';
import { PageHeader } from '@/components/PageHeader';
import { MusicContext } from '@/context/MusicContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SongItem } from '@/components/SongItem';

export default function HomePage() {
  const musicContext = useContext(MusicContext);
  const songs = musicContext?.songs || [];
  const albums = getAlbums(songs);
  const recentlyAddedAlbums = [...albums].reverse();
  const recentlyAddedSongs = [...songs].reverse().slice(0, 12);

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

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-7xl px-0 pb-8">
        <PageHeader title="Home" />

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
              <AlbumCard key={album.name} album={album} />
            ))}
          </div>
        </section>

        <section className="px-4 md:px-6 mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">All Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {albums.map((album) => (
              <AlbumCard key={album.name} album={album} />
            ))}
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
