
'use client'

import { useContext, useEffect, useState, useMemo, Suspense } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { MusicContext } from '@/context/MusicContext';
import type { Playlist, Song } from '@/lib/types';
import { PageHeader } from '@/components/PageHeader';
import { SongItem } from '@/components/SongItem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play, ListMusic, AlertTriangle, MoreHorizontal, GripVertical, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { RenamePlaylistDialog } from '@/components/RenamePlaylistDialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


function SortablePlaylistItem({ song, queue, onRemove, isEditing }: { song: Song, queue: Song[], onRemove: (songId: string) => void, isEditing: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: song.id, disabled: !isEditing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <SongItem
                song={song}
                queue={queue}
                onRemove={isEditing ? () => onRemove(song.id) : undefined}
                dragHandleProps={isEditing ? listeners : undefined}
                isDragging={isDragging}
            />
        </div>
    );
}

function PlaylistDetailContent() {
  const searchParams = useSearchParams();
  const playlistIdParam = searchParams.get('id');

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const musicContext = useContext(MusicContext);
  const router = useRouter();
  
  useEffect(() => {
    if (musicContext?.playlists && playlistIdParam) {
      const foundPlaylist = musicContext.playlists.find(p => p.id === playlistIdParam);
      if (foundPlaylist) {
        setPlaylist(foundPlaylist);
      } else {
        notFound();
      }
    }
  }, [musicContext?.playlists, playlistIdParam]);

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
  
  const handleDeletePlaylist = () => {
    if (playlist) {
      musicContext?.deletePlaylist(playlist.id);
      router.push('/library');
    }
  }

  const handleRemoveSong = (songId: string) => {
    if (playlist) {
        musicContext?.removeSongFromPlaylist(playlist.id, songId);
    }
  }
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (playlist && over && active.id !== over.id) {
        const oldIndex = songs.findIndex((s) => s.id === active.id);
        const newIndex = songs.findIndex((s) => s.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          musicContext?.reorderPlaylist(playlist.id, oldIndex, newIndex);
        }
    }
  };


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
                    <div className="flex items-center gap-2 mt-4">
                        {isEditing ? (
                             <Button onClick={() => setIsEditing(false)}>
                                Done
                            </Button>
                        ) : (
                            <>
                                <Button onClick={handlePlayPlaylist} disabled={songs.length === 0}>
                                    <Play className="mr-2 h-4 w-4" /> Play
                                </Button>
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-10 w-10">
                                                <MoreHorizontal />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Edit Playlist
                                            </DropdownMenuItem>
                                            <RenamePlaylistDialog playlist={playlist}>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                Rename Playlist
                                                </DropdownMenuItem>
                                            </RenamePlaylistDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className="text-destructive">Delete Playlist</DropdownMenuItem>
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
                                            <AlertDialogAction onClick={handleDeletePlaylist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 px-2 md:px-4">
          <div className="flex flex-col">
            {songs.length > 0 ? (
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        {songs.map((song) => (
                            <SortablePlaylistItem key={song.id} song={song} queue={songs} onRemove={handleRemoveSong} isEditing={isEditing}/>
                        ))}
                    </SortableContext>
                </DndContext>
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

export default function PlaylistDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlaylistDetailContent />
    </Suspense>
  );
}
