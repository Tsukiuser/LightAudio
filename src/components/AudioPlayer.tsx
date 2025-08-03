
'use client';

import { useContext, useEffect, useState }from 'react';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ListMusic, Shuffle, Repeat, Repeat1, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { formatDuration } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { SongItem } from './SongItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { StaticLogo } from './StaticLogo';
import { cn } from '@/lib/utils';
import { AlbumPlaceholder } from './AlbumPlaceholder';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import NowPlayingSheet from './NowPlayingSheet';
import Link from 'next/link';

export default function AudioPlayer() {
  const musicContext = useContext(MusicContext);
  const audioRef = musicContext?.audioRef;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const isMobile = useIsMobile();


  useEffect(() => {
    const audio = audioRef?.current;
    if (audio && musicContext?.currentSong) {
        if (audio.src !== musicContext.currentSong.url) {
            audio.src = musicContext.currentSong.url;
            audio.load();
        }
        musicContext.play();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicContext?.currentSong]);

  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    
    const setAudioData = () => {
      setDuration(audio.duration);
      setProgress(audio.currentTime);
    }

    const setAudioTime = () => setProgress(audio.currentTime);
    
    const onEnded = () => musicContext?.playNextSong();

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if(audioRef?.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, audioRef]);

  const togglePlayPause = () => {
    if (!musicContext?.currentSong) return;
    if (musicContext.isPlaying) {
      musicContext.pause();
    } else {
      musicContext.play();
    }
  };
  
  const handleSeek = (value: number[]) => {
    if (audioRef?.current) {
      audioRef.current.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    if (value[0] > 0) {
      setIsMuted(false);
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted);
  }

  const handleSkipForward = () => {
    musicContext?.playNextSong();
  }

  const handleSkipBack = () => {
    musicContext?.playPreviousSong();
  }

  if (!musicContext?.currentSong) {
    return null;
  }
  
  const { currentSong, queue, isPlaying, isShuffled, repeatMode, toggleShuffle, toggleRepeat, removeFromQueue, clearQueue } = musicContext;
  const currentSongIndexInQueue = queue.findIndex(s => s.id === currentSong.id);
  const upNext = currentSongIndexInQueue > -1 ? queue.slice(currentSongIndexInQueue + 1) : [];

  const playerBaseClass = "fixed right-0 z-20 transition-[margin-left] duration-300 ease-in-out";
  const playerPositionClass = isMobile 
    ? "bottom-16 left-0" 
    : "bottom-0 md:group-data-[sidebar-state=expanded]/body:ml-64 md:group-data-[sidebar-state=collapsed]/body:ml-12";


  if (isMobile) {
    return (
      <>
        <div className={cn(playerBaseClass, playerPositionClass)}>
          <div className="bg-background/80 backdrop-blur-md border-t border-border/80 p-2">
             <div className="container mx-auto flex items-center gap-3">
                 <div className="h-10 w-10 flex-shrink-0 cursor-pointer" onClick={() => setIsNowPlayingOpen(true)}>
                    {currentSong.coverArt ? (
                      <Image
                        src={currentSong.coverArt}
                        alt={currentSong.album}
                        width={40}
                        height={40}
                        className="h-full w-full rounded-md object-cover"
                        data-ai-hint="album cover"
                      />
                    ) : (
                      <AlbumPlaceholder className="rounded-md h-full w-full" />
                    )}
                 </div>
                 <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsNowPlayingOpen(true)}>
                    <p className="font-medium truncate text-foreground">{currentSong.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
                 </div>
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={togglePlayPause}>
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleSkipForward} disabled={queue.length <= 1}>
                      <SkipForward className="h-5 w-5" />
                    </Button>
                 </div>
             </div>
          </div>
        </div>
        <NowPlayingSheet 
            open={isNowPlayingOpen} 
            onOpenChange={setIsNowPlayingOpen}
            progress={progress}
            duration={duration}
            onSeek={handleSeek}
        />
      </>
    )
  }

  return (
    <div className={cn(playerBaseClass, playerPositionClass)}>
      <TooltipProvider>
        <div className="bg-background/80 backdrop-blur-md border-t border-border/80 p-2 md:p-4">
          <div className="container mx-auto flex items-center gap-4">
            <Link href={`/album/${encodeURIComponent(currentSong.artist)}/${encodeURIComponent(currentSong.album)}`} className="h-10 w-10 md:h-14 md:w-14 flex-shrink-0">
                {currentSong.coverArt ? (
                  <Image
                    src={currentSong.coverArt}
                    alt={currentSong.album}
                    width={56}
                    height={56}
                    className="h-full w-full rounded-md object-cover"
                    data-ai-hint="album cover"
                  />
                ) : (
                  <AlbumPlaceholder className="rounded-md h-full w-full" />
                )}
            </Link>
            <div className="flex-1 min-w-0 md:min-w-fit md:w-1/3">
              <p className="font-medium truncate text-foreground">{currentSong.title}</p>
              <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-1 md:gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-10 w-10", isShuffled && "text-primary")} onClick={toggleShuffle}>
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Shuffle</p>
                  </TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleSkipBack} disabled={queue.length <= 1}>
                  <SkipBack className="h-5 w-5" />
                </Button>
                <Button variant="default" size="icon" className="h-12 w-12 rounded-full" onClick={togglePlayPause}>
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleSkipForward} disabled={queue.length <= 1}>
                  <SkipForward className="h-5 w-5" />
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn("h-10 w-10", repeatMode !== 'none' && "text-primary")} onClick={toggleRepeat}>
                          {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      {repeatMode === 'none' ? <p>Repeat Off</p> : repeatMode === 'all' ? <p>Repeat All</p> : <p>Repeat One</p>}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10 text-right">{formatDuration(progress)}</span>
                  <Slider
                      value={[progress]}
                      max={duration || 0}
                      step={1}
                      onValueChange={handleSeek}
                      className="w-full"
                  />
                  <span className="text-xs text-muted-foreground w-10">{formatDuration(duration)}</span>
              </div>
            </div>
            
            <div className="hidden md:flex flex-1 w-1/3 items-center justify-end gap-2">
              <button onClick={() => alert('Equalizer feature coming soon!')}>
                <StaticLogo />
              </button>
              <Dialog>
                  <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <ListMusic className="h-5 w-5" />
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md p-0">
                      <DialogHeader className="p-4 border-b">
                          <DialogTitle>Up Next</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]">
                          <div className="p-2">
                          {upNext.length > 0 ? (
                            <>
                              {upNext.map((song) => <SongItem key={song.id} song={song} onRemove={() => removeFromQueue?.(song.id)} />)}
                              <div className="p-2 mt-2">
                                  <Button variant="outline" className="w-full" onClick={clearQueue}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Clear Queue
                                  </Button>
                              </div>
                            </>
                          ) : (
                              <p className="p-4 text-center text-muted-foreground">The queue is empty.</p>
                          )}
                          </div>
                      </ScrollArea>
                  </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-24"
              />
            </div>

          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
