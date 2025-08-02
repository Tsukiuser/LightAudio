
'use client'

import { useContext, useEffect, useState } from 'react';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { getAlbums } from '@/lib/music-utils';
import type { Album } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { SongItem } from '@/components/SongItem';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AlbumDetailPage({ params }: { params: { artist: string; album: string } }) {
  const [album, setAlbum] = useState<Album | null>(null);
  const musicContext = useContext(MusicContext);
  
  useEffect(() => {
    if (musicContext?.songs) {
      const artistName = decodeURIComponent(params.artist);
      const albumName = decodeURIComponent(params.album);
      const allAlbums = getAlbums(musicContext.songs);
      const foundAlbum = allAlbums.find(a => a.name === albumName && a.artist === artistName);
      if (foundAlbum) {
        setAlbum(foundAlbum);
      } else {
        // If the album is not found after songs are loaded, it's a 404
        notFound();
      }
    }
  }, [musicContext?.songs, params.artist, params.album, params]);

  const handlePlayAlbum = () => {
    if (album?.songs && album.songs.length > 0) {
      musicContext?.playSong(album.songs[0], album.songs);
    }
  }

  if (musicContext?.isLoading || !album) {
    return (
      <div className="container mx-auto max-w-7xl px-0">
        <PageHeader title="" />
        <div className="px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <Skeleton className="h-48 w-48 md:h-64 md:w-64 rounded-lg flex-shrink-0" />
            <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4">
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-10 w-32" />
            </div>
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
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                <Image 
                    src={album.coverArt}
                    alt={`Cover for ${album.name}`}
                    width={256}
                    height={256}
                    className="h-48 w-48 md:h-64 md:w-64 rounded-lg shadow-lg object-cover flex-shrink-0"
                    data-ai-hint="album cover"
                />
                <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4">
                    <p className="text-sm font-medium text-muted-foreground uppercase">Album</p>
                    <h1 className="text-3xl md:text-5xl font-bold mt-1 text-foreground break-words">{album.name}</h1>
                    <h2 className="text-xl md:text-2xl text-muted-foreground mt-2">{album.artist}</h2>
                    <p className="text-sm text-muted-foreground mt-2">{album.songs.length} songs</p>
                    <Button onClick={handlePlayAlbum} className="mt-4">
                        <Play className="mr-2 h-4 w-4" /> Play Album
                    </Button>
                </div>
            </div>
        </div>

        <div className="mt-8 px-2 md:px-4">
          <div className="flex flex-col">
            {album.songs.map((song) => (
                <SongItem key={song.id} song={song} queue={album.songs} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
