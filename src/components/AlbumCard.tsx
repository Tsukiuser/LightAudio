
import Image from 'next/image';
import Link from 'next/link';
import type { Album } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlbumPlaceholder } from './AlbumPlaceholder';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { ListPlus, MoreVertical, Music2, User } from 'lucide-react';
import React, { useContext } from 'react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';

interface AlbumCardProps {
  album: Album;
}

export const AlbumCard = React.memo(function AlbumCard({ album }: AlbumCardProps) {
    const musicContext = useContext(MusicContext);
    const { toast } = useToast();

    const handleAddToQueue = () => {
        album.songs.forEach(song => musicContext?.addToQueue(song));
        toast({
            title: "Added to queue",
            description: `All songs from "${album.name}" have been added to the queue.`,
        });
    }

    const handleAddToPlaylist = (playlistId: string) => {
        album.songs.forEach(song => musicContext?.addSongToPlaylist(playlistId, song.id));
    }


  return (
    <div className="group relative">
        <Link href={`/album?artist=${encodeURIComponent(album.artist)}&name=${encodeURIComponent(album.name)}`}>
            <Card className="overflow-hidden transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
                <CardContent className="p-0">
                    {album.coverArt ? (
                        <Image
                            src={album.coverArt}
                            alt={`Cover art for ${album.name}`}
                            width={300}
                            height={300}
                            className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                            data-ai-hint="album cover"
                        />
                    ) : (
                        <AlbumPlaceholder className="transition-transform group-hover:scale-105 rounded-lg"/>
                    )}
                </CardContent>
            </Card>
        </Link>
      <div className="mt-2 flex justify-between items-start">
        <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{album.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddToQueue}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add to Queue
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Music2 className="mr-2 h-4 w-4" />
                        Add to Playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                    {musicContext?.playlists && musicContext.playlists.length > 0 ? (
                        musicContext.playlists.map(playlist => (
                        <DropdownMenuItem key={playlist.id} onClick={() => handleAddToPlaylist(playlist.id)}>
                            {playlist.name}
                        </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>No playlists found</DropdownMenuItem>
                    )}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/artist?name=${encodeURIComponent(album.artist)}`}>
                        <User className="mr-2 h-4 w-4" />
                        Go to Artist
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
