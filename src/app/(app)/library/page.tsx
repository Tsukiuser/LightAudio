
'use client'

import { useContext } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ListMusic, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { getAlbums, getArtists } from '@/lib/music-utils';
import { AlbumCard } from '@/components/AlbumCard';
import { SongItem } from '@/components/SongItem';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlbumPlaceholder } from '@/components/AlbumPlaceholder';
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RenamePlaylistDialog } from '@/components/RenamePlaylistDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Playlist } from '@/lib/types';


export default function LibraryPage() {
  const musicContext = useContext(MusicContext);
  const allSongs = musicContext?.songs || [];
  const allAlbums = getAlbums(allSongs);
  const allArtists = getArtists(allSongs);
  const allPlaylists = musicContext?.playlists || [];

  const handleDeletePlaylist = (playlistId: string) => {
    musicContext?.deletePlaylist(playlistId);
  }

  const PlaylistCard = ({ playlist }: { playlist: Playlist }) => (
    <div className="group relative">
      <Link href={`/playlist/${playlist.id}`} key={playlist.id}>
        <Card className="overflow-hidden transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
          <CardContent className="p-0">
            <div className="aspect-square w-full bg-muted flex items-center justify-center">
              <ListMusic className="h-1/2 w-1/2 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </Link>
      <div className="mt-2 flex justify-between items-start">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate">{playlist.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{playlist.songIds.length} songs</p>
        </div>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <RenamePlaylistDialog playlist={playlist}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Rename
                </DropdownMenuItem>
              </RenamePlaylistDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Delete &quot;{playlist.name}&quot;?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the playlist.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeletePlaylist(playlist.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );


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
            <CreatePlaylistDialog>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Playlist
              </Button>
            </CreatePlaylistDialog>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 mt-6">
              {allPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="artists" className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {allArtists.map((artist) => (
                <Link key={artist.name} href={`/artist/${encodeURIComponent(artist.name)}`} className="group relative text-center">
                    <div className="aspect-square w-full rounded-full overflow-hidden transition-transform group-hover:scale-105">
                      {artist.coverArt ? (
                        <Image
                          src={artist.coverArt}
                          alt={`Photo of ${artist.name}`}
                          width={300}
                          height={300}
                          className="h-full w-full object-cover"
                          data-ai-hint="artist portrait"
                        />
                      ) : (
                        <AlbumPlaceholder />
                      )}
                    </div>
                      <div className="mt-2">
                        <h3 className="font-semibold text-foreground truncate">{artist.name}</h3>
                      </div>
                </Link>
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
