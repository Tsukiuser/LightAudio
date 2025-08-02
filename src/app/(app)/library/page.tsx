
'use client'

import { useContext } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getAlbums, getArtists } from '@/lib/music-utils';
import { AlbumCard } from '@/components/AlbumCard';
import { SongItem } from '@/components/SongItem';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function LibraryPage() {
  const musicContext = useContext(MusicContext);
  const allSongs = musicContext?.songs || [];
  const allAlbums = getAlbums(allSongs);
  const allArtists = getArtists(allSongs);

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-7xl px-0 pb-8">
        <PageHeader title="Library" />

        <Tabs defaultValue="playlists" className="w-full px-4 md:px-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="songs">Songs</TabsTrigger>
          </TabsList>

          <TabsContent value="playlists" className="mt-6">
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Playlist
            </Button>
            {/* Future playlists will go here */}
          </TabsContent>

          <TabsContent value="artists" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {allArtists.map((artist) => (
                <div key={artist.name} className="group relative cursor-pointer text-center">
                  <Image
                      src={artist.coverArt}
                      alt={`Photo of ${artist.name}`}
                      width={300}
                      height={300}
                      className="aspect-square w-full rounded-full object-cover transition-transform group-hover:scale-105"
                      data-ai-hint="artist portrait"
                    />
                    <div className="mt-2">
                      <h3 className="font-semibold text-foreground truncate">{artist.name}</h3>
                    </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albums" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {allAlbums.map((album) => (
                <AlbumCard key={`${album.name}-${album.artist}`} album={album} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="songs" className="mt-4 -mx-2 md:-mx-4">
            <div className="flex flex-col">
              {allSongs.map((song) => (
                <SongItem key={song.id} song={song} queue={allSongs}/>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
