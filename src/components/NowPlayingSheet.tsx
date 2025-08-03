
'use client';

import { useContext } from 'react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MusicContext } from '@/context/MusicContext';
import { AlbumPlaceholder } from './AlbumPlaceholder';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { SongItem } from './SongItem';
import { MusicVisualizer } from './MusicVisualizer';

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
        queue
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-full bg-background p-0 border-0 flex flex-col">
                <div className="p-6 flex-shrink-0">
                    <div className="aspect-square rounded-lg shadow-lg max-w-sm mx-auto overflow-hidden">
                        {currentSong.coverArt ? (
                            <Image
                                src={currentSong.coverArt}
                                alt={`Cover for ${currentSong.album}`}
                                width={500}
                                height={500}
                                className="h-full w-full object-cover"
                                data-ai-hint="album cover"
                            />
                        ) : (
                            <AlbumPlaceholder className="h-full w-full rounded-lg" />
                        )}
                    </div>
                    <div className="text-center mt-6">
                        <h2 className="text-2xl font-bold text-foreground">{currentSong.title}</h2>
                        <p className="text-lg text-muted-foreground">{currentSong.artist}</p>
                    </div>
                </div>

                <div className="px-6 space-y-4 flex-shrink-0">
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

                    <div className="flex justify-center items-center gap-2">
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
                
                <div className="flex justify-between items-center px-6 pt-6 pb-2 flex-shrink-0">
                    <h3 className="text-lg font-semibold">Up Next</h3>
                    {isPlaying && <MusicVisualizer numBars={4} className="w-5 h-5" />}
                </div>

                <ScrollArea className="flex-1">
                    <div className="px-4 pb-4">
                        {upNext.length > 0 ? (
                            upNext.map((song) => <SongItem key={song.id} song={song} />)
                        ) : (
                            <p className="p-4 text-center text-sm text-muted-foreground">End of queue.</p>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}

    