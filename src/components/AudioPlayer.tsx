
'use client';

import { useContext, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { MusicContext } from '@/context/MusicContext';
import { Slider } from './ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';
import { formatDuration } from '@/lib/utils';

export default function AudioPlayer() {
  const musicContext = useContext(MusicContext);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);


  useEffect(() => {
    if (musicContext?.currentSong && audioRef.current) {
      audioRef.current.src = musicContext.currentSong.url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback failed", e));
    }
  }, [musicContext?.currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const setAudioData = () => {
      setDuration(audio.duration);
      setProgress(audio.currentTime);
    }

    const setAudioTime = () => setProgress(audio.currentTime);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('ended', handleSkipForward);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('play', () => setIsPlaying(true));
      audio.removeEventListener('pause', () => setIsPlaying(false));
      audio.removeEventListener('ended', handleSkipForward);
    };
  }, [musicContext?.currentSong]);

  useEffect(() => {
    if(audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
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
  
  const { currentSong } = musicContext;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-20">
      <div className="bg-background/80 backdrop-blur-md border-t border-border/80 p-2 md:p-4">
        <audio ref={audioRef} />
        <div className="container mx-auto flex items-center gap-4">
            <Image
              src={currentSong.coverArt}
              alt={currentSong.album}
              width={56}
              height={56}
              className="h-10 w-10 md:h-14 md:w-14 rounded-md object-cover"
              data-ai-hint="album cover"
            />
          <div className="flex-1 min-w-0 md:min-w-fit md:w-1/3">
            <p className="font-medium truncate text-foreground">{currentSong.title}</p>
            <p className="text-sm text-muted-foreground truncate">{currentSong.artist}</p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleSkipBack}>
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button variant="default" size="icon" className="h-12 w-12 rounded-full" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={handleSkipForward}>
                <SkipForward className="h-5 w-5" />
              </Button>
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
          
          <div className="hidden md:flex w-1/3 items-center justify-end gap-2">
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
    </div>
  );
}
