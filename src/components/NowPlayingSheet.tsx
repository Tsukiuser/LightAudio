
'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { MusicContext } from '@/context/MusicContext';
import { AlbumPlaceholder } from './AlbumPlaceholder';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ChevronUp, X, Trash2 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { SongItem } from './SongItem';
import { MusicVisualizer } from './MusicVisualizer';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSongItem({ song }: { song: any }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: song.id });

    const musicContext = useContext(MusicContext);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <SongItem
                song={song}
                onRemove={() => musicContext?.removeFromQueue?.(song.id)}
                dragHandleProps={listeners}
                isDragging={isDragging}
            />
        </div>
    );
}

interface NowPlayingSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    progress: number;
    duration: number;
    onSeek: (value: number[]) => void;
}

export default function NowPlayingSheet({ open, onOpenChange, progress, duration, onSeek }: NowPlayingSheetProps) {
    const musicContext = useContext(MusicContext);

    if (!musicContext?.currentSong) {
        return null;
    }

    const {
        currentSong,
        isPlaying,
        play,
        pause,
        playNextSong,
        playPreviousSong,
        isShuffled,
        repeatMode,
        toggleShuffle,
        toggleRepeat,
        queue,
        removeFromQueue,
        clearQueue,
        reorderQueue
    } = musicContext;

    const currentSongIndexInQueue = queue.findIndex(s => s.id === currentSong.id);
    const upNext = queue.slice(currentSongIndexInQueue + 1);

    const togglePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }
    
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = upNext.findIndex((s) => s.id === active.id);
            const newIndex = upNext.findIndex((s) => s.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1 && reorderQueue) {
                // We need to adjust indices because `upNext` doesn't include current song
                reorderQueue(oldIndex + 1, newIndex + 1);
            }
        }
    };


    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-full bg-background p-0 border-0 flex flex-col" hideCloseButton>
                <SheetHeader className="p-4 flex-row items-center justify-between border-b flex-shrink-0">
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon">
                            <X className="h-5 w-5" />
                        </Button>
                    </SheetClose>
                    <SheetTitle className="text-center truncate">Now Playing</SheetTitle>
                    <MusicVisualizer numBars={4} className="w-5 h-5" />
                </SheetHeader>
                
                <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
                    <Link href={`/album?artist=${encodeURIComponent(currentSong.artist)}&name=${encodeURIComponent(currentSong.album)}`} className="aspect-square rounded-lg shadow-lg max-w-sm mx-auto overflow-hidden group" onClick={() => onOpenChange(false)}>
                        {currentSong.coverArt ? (
                            <Image
                                src={currentSong.coverArt}
                                alt={`Cover for ${currentSong.album}`}
                                width={500}
                                height={500}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint="album cover"
                            />
                        ) : (
                            <AlbumPlaceholder className="h-full w-full rounded-lg transition-transform duration-300 group-hover:scale-105" />
                        )}
                    </Link>
                    <div className="text-center mt-4">
                        <h2 className="text-2xl font-bold text-foreground truncate">{currentSong.title}</h2>
                        <p className="text-lg text-muted-foreground truncate">{currentSong.artist}</p>
                    </div>

                    <div className="space-y-4 mt-4">
                        <div>
                            <Slider
                                value={[progress]}
                                max={duration || 0}
                                step={1}
                                onValueChange={onSeek}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{formatDuration(progress)}</span>
                                <span>{formatDuration(duration)}</span>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-1">
                            <Button variant="ghost" size="icon" className={cn("h-12 w-12", isShuffled && "text-primary")} onClick={toggleShuffle}>
                                <Shuffle className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playPreviousSong} disabled={queue.length <= 1}>
                                <SkipBack className="h-6 w-6" />
                            </Button>
                            <Button variant="default" size="icon" className="h-16 w-16 rounded-full" onClick={togglePlayPause}>
                                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-12 w-12" onClick={playNextSong} disabled={queue.length <= 1}>
                                <SkipForward className="h-6 w-6" />
                            </Button>
                            <Button variant="ghost" size="icon" className={cn("h-12 w-12", repeatMode !== 'none' && "text-primary")} onClick={toggleRepeat}>
                                {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                            </Button>
                        </div>
                    </div>
                </div>
                
                 <div className="flex-shrink-0 border-t pt-2">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" className="w-full">
                                <span className="mr-2">Up Next</span>
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-4/5 bg-background p-0 flex flex-col">
                             <SheetHeader className="p-4 border-b flex flex-row justify-between items-center">
                                <SheetTitle>Up Next</SheetTitle>
                                {upNext.length > 0 && (
                                    <Button variant="outline" size="sm" onClick={clearQueue}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Clear
                                    </Button>
                                )}
                            </SheetHeader>
                            <ScrollArea className="flex-1">
                                <div className="p-1">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={upNext.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                            {upNext.map((song) => <SortableSongItem key={song.id} song={song} />)}
                                        </SortableContext>
                                    </DndContext>
                                    {upNext.length === 0 && (
                                        <p className="p-4 text-center text-sm text-muted-foreground">End of queue.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </div>

            </SheetContent>
        </Sheet>
    )
}
