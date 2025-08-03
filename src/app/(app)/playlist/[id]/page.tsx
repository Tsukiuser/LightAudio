
'use client'

import { useContext, useEffect, useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { MusicContext } from '@/context/MusicContext';
import type { Playlist, Song } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { SongItem } from '@/components/SongItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, ListMusic, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PlaylistDetailPage({ params }: { params: { id: string } }) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const musicContext = useContext(MusicContext);
  
  useEffect(() => {
    if (musicContext?.playlists) {
      const foundPlaylist = musicContext.playlists.find(p => p.id === params.id);
      if (foundPlaylist) {
        setPlaylist(foundPlaylist);
      } else {
        notFound();
      }
    }
  }, [musicContext?.playlists, params.id]);

  const { songs, missingSongsCount } = useMemo(() => {
    if (!playlist || !musicContext) return { songs: [], missingSongsCount: 0 };
    const playlistSongs = musicContext.getPlaylistSongs(playlist.id);
    const missingCount = playlist.songIds.length - playlistSongs.length;
    return { songs: playlistSongs, missingSongsCount: missingCount };
  }, [playlist, musicContext]);


  const handlePlayPlaylist = () => {
    if (songs.length > 0) {
      musicContext?.playSong(songs[0], songs);
    }
  }

  if (musicContext?.isLoading || !playlist) {
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
                <div className="h-48 w-48 md:h-64 md:w-64 rounded-lg shadow-lg flex-shrink-0 bg-muted flex items-center justify-center">
                    <ListMusic className="h-1/2 w-1/2 text-muted-foreground/50" />
                </div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left pt-4">
                    <p className="text-sm font-medium text-muted-foreground uppercase">Playlist</p>
                    <h1 className="text-3xl md:text-5xl font-bold mt-1 text-foreground break-words">{playlist.name}</h1>
                    <p className="text-sm text-muted-foreground mt-2">{songs.length} songs</p>
                    <Button onClick={handlePlayPlaylist} className="mt-4" disabled={songs.length === 0}>
                        <Play className="mr-2 h-4 w-4" /> Play
                    </Button>
                </div>
            </div>
        </div>

        <div className="mt-8 px-2 md:px-4">
          <div className="flex flex-col">
            {songs.length > 0 ? (
                songs.map((song) => (
                    <SongItem key={song.id} song={song} queue={songs} />
                ))
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    <p>This playlist is empty.</p>
                    <p className="text-sm">Add songs from the library to get started.</p>
                </div>
            )}
          </div>
           {missingSongsCount > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 mt-4 bg-muted rounded-md">
                    <AlertTriangle className="h-4 w-4" />
                    <p>{missingSongsCount} {missingSongsCount > 1 ? 'titles are' : 'title is'} unavailable.</p>
                </div>
            )}
        </div>
      </div>
    </ScrollArea>
  );
}
