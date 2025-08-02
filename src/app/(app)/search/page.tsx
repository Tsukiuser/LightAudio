
'use client';

import { useState, useMemo, useContext } from 'react';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/PageHeader';
import { SongItem } from '@/components/SongItem';
import { Search as SearchIcon } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const musicContext = useContext(MusicContext);
  const allSongs = musicContext?.songs || [];

  const filteredSongs = useMemo(() => {
    if (!query) {
      return [];
    }
    return allSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(query.toLowerCase()) ||
        song.artist.toLowerCase().includes(query.toLowerCase()) ||
        song.album.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, allSongs]);

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-7xl px-0 pb-8">
        <PageHeader title="Search" />
        <div className="px-4 md:px-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for songs, artists, or albums..."
              className="w-full pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 px-2 md:px-4">
          {query && filteredSongs.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}
          <div className="flex flex-col">
            {filteredSongs.map((song) => (
              <SongItem key={song.id} song={song} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
