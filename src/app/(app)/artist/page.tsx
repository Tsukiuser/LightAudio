
'use client'

import { useContext, useEffect, useState, Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { getArtists } from '@/lib/music-utils';
import type { Artist } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { AlbumCard } from '@/components/AlbumCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlbumPlaceholder } from '@/components/AlbumPlaceholder';

function ArtistDetailContent() {
  const searchParams = useSearchParams();
  const artistNameParam = searchParams.get('name');

  const [artist, setArtist] = useState<Artist | null>(null);
  const musicContext = useContext(MusicContext);

  useEffect(() => {
    if (musicContext?.songs && artistNameParam) {
      const artistName = decodeURIComponent(artistNameParam);
      const allArtists = getArtists(musicContext.songs);
      const foundArtist = allArtists.find(a => a.name === artistName);
      if (foundArtist) {
        setArtist(foundArtist);
      } else {
        notFound();
      }
    }
  }, [musicContext?.songs, artistNameParam]);

  if (musicContext?.isLoading || !artist) {
    return (
      <div className="container mx-auto max-w-7xl px-0">
        <PageHeader title="" />
        <div className="px-4 md:px-6">
          <div className="flex flex-col items-center gap-6">
            <Skeleton className="h-48 w-48 rounded-full" />
            <Skeleton className="h-9 w-64 mb-2" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-7xl px-0 pb-8">
        <PageHeader title="" />
        <div className="px-4 md:px-6">
          <div className="flex flex-col items-center gap-6">
            <div className="h-48 w-48 rounded-full shadow-lg overflow-hidden flex-shrink-0">
              {artist.coverArt ? (
                <Image
                  src={artist.coverArt}
                  alt={`Photo of ${artist.name}`}
                  width={200}
                  height={200}
                  className="h-full w-full object-cover"
                  data-ai-hint="artist portrait"
                />
              ) : (
                <AlbumPlaceholder className="h-full w-full" />
              )}
            </div>
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground break-words">{artist.name}</h1>
            </div>
          </div>
        </div>

        <div className="mt-8 px-4 md:px-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {artist.albums.map((album) => (
              <AlbumCard key={`${album.name}-${album.artist}`} album={album} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default function ArtistDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArtistDetailContent />
    </Suspense>
  );
}
