
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Song } from '@/lib/types';
// @ts-ignore
import * as music from 'music-metadata-browser';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from '@/lib/idb';

type RepeatMode = 'none' | 'all' | 'one';

interface MusicContextType {
  songs: Song[];
  currentSong: Song | null;
  queue: Song[];
  originalQueue: Song[];
  playSong: (song: Song, newQueue?: Song[]) => void;
  playNextSong: () => void;
  playPreviousSong: () => void;
  addToQueue: (song: Song) => void;
  loadMusic: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  rescanMusic: () => Promise<void>;
  clearLibrary: () => void;
  hasAccess: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  analyser: AnalyserNode | null;
  play: () => void;
  pause: () => void;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export const MusicContext = createContext<MusicContextType | null>(null);

let storedHandle: FileSystemDirectoryHandle | null = null; 

async function verifyPermission(directoryHandle: FileSystemDirectoryHandle) {
    const options = { mode: 'read' };
    if ((await directoryHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await directoryHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);


  useEffect(() => {
    const audioElement = new Audio();
    audioElement.id = 'audio-player-core';
    document.body.appendChild(audioElement);
    audioRef.current = audioElement;

    const setupAudioContext = () => {
        if (audioRef.current && !audioContextRef.current) {
            try {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = context;
                
                const analyserNode = context.createAnalyser();
                analyserNode.fftSize = 256;
                setAnalyser(analyserNode);

                if (!sourceNodeRef.current) {
                    const source = context.createMediaElementSource(audioRef.current);
                    sourceNodeRef.current = source;
                    source.connect(analyserNode);
                    analyserNode.connect(context.destination);
                }
            } catch (e) {
                console.error("Web Audio API is not supported in this browser", e);
            }
        }
    };

    setupAudioContext();

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    audioRef.current?.addEventListener('play', handlePlay);
    audioRef.current?.addEventListener('pause', handlePause);

    const resumeAudioContext = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };
    
    document.addEventListener('click', resumeAudioContext, { once: true });
    
    return () => {
        document.removeEventListener('click', resumeAudioContext);
        audioRef.current?.removeEventListener('play', handlePlay);
        audioRef.current?.removeEventListener('pause', handlePause);
        if (audioElement) {
            document.body.removeChild(audioElement);
        }
    }
  }, []);

  const loadMusicFromHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle, isInitialLoad = false) => {
    if (!isInitialLoad) setIsLoading(true);
    
    const permissionGranted = await verifyPermission(dirHandle);
    if (!permissionGranted) {
        console.error("Permission denied to read directory.");
        await del('directoryHandle');
        storedHandle = null;
        setHasAccess(false);
        setIsLoading(false);
         toast({
            title: 'Permission Denied',
            description: 'Could not access the music folder.',
            variant: 'destructive'
        })
        return;
    }

    setHasAccess(true);
    storedHandle = dirHandle;
    await set('directoryHandle', dirHandle);

    const newSongs: Song[] = [];
    
    async function* getFilesRecursively(entry: FileSystemDirectoryHandle): AsyncGenerator<FileSystemFileHandle> {
        for await (const child of entry.values()) {
            if (child.kind === 'file' && (child.name.endsWith('.mp3') || child.name.endsWith('.flac') || child.name.endsWith('.m4a'))) {
                yield child;
            } else if (child.kind === 'directory') {
                yield* getFilesRecursively(child);
            }
        }
    }

    try {
        for await (const fileHandle of getFilesRecursively(dirHandle)) {
            try {
                const file = await fileHandle.getFile();
                const metadata = await music.parseBlob(file);
                
                const coverArt = metadata.common.picture?.[0] 
                    ? `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}`
                    : null;

                newSongs.push({
                    id: fileHandle.name + '-' + file.size, // simple unique id
                    title: metadata.common.title || file.name,
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: metadata.common.album || 'Unknown Album',
                    duration: metadata.format.duration ? new Date(metadata.format.duration * 1000).toISOString().substr(14, 5) : '0:00',
                    coverArt: coverArt,
                    url: URL.createObjectURL(file),
                    fileHandle: fileHandle,
                });

            } catch(e) {
                console.warn(`Could not read metadata for ${fileHandle.name}`, e);
            }
        }
    } catch(e) {
        console.error("Error reading music files", e);
    }
    
    setSongs(newSongs);
    setIsLoading(false);
    if (newSongs.length > 0 && !isInitialLoad) {
        toast({
            title: 'Library Updated',
            description: `Found ${newSongs.length} songs.`,
        })
    }
  }, [toast]);

  const rescanMusic = useCallback(async () => {
    if (storedHandle) {
        await loadMusicFromHandle(storedHandle);
    } else {
        toast({
            title: 'No Folder Selected',
            description: 'Please select a music folder first.',
            variant: 'destructive'
        })
    }
  }, [loadMusicFromHandle, toast]);
  
  const clearLibrary = useCallback(async () => {
      setSongs([]);
      setCurrentSong(null);
      setQueue([]);
      setHasAccess(false);
      storedHandle = null;
      await del('directoryHandle');
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
        try {
            const handle = await get<FileSystemDirectoryHandle>('directoryHandle');
            if (handle) {
                storedHandle = handle;
                setHasAccess(true);
                await loadMusicFromHandle(handle, true);
            } else {
                setIsLoading(false);
            }
        } catch (e) {
            console.error("Could not retrieve directory handle from IndexedDB", e);
            setIsLoading(false);
        }
    };
    checkAccess();
  }, [loadMusicFromHandle]);

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setCurrentSong(song);
    
    const songsToQueue = newQueue || songs.slice(songs.findIndex(s => s.id === song.id));
    setOriginalQueue(songsToQueue);

    if (isShuffled) {
        const shuffledQueue = shuffleArray(songsToQueue.filter(s => s.id !== song.id));
        setQueue([song, ...shuffledQueue]);
    } else {
        setQueue(songsToQueue);
    }
  };

  const play = () => {
    if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
        setIsPlaying(true);
    }
  }

  const pause = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  }

  const playNextSong = () => {
    if (!currentSong || queue.length === 0) return;
    
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        play();
      }
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        setCurrentSong(null);
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentSong(queue[nextIndex]);
  };

  const playPreviousSong = () => {
    if (!currentSong || queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(queue[currentIndex - 1]);
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prevQueue => [...prevQueue, song]);
    setOriginalQueue(prevOrig => [...prevOrig, song]);
  }

  const toggleShuffle = () => {
    setIsShuffled(prev => {
        const newShuffleState = !prev;
        if (newShuffleState) {
            const currentSongIndex = queue.findIndex(s => s.id === currentSong?.id);
            const current = queue[currentSongIndex];
            const rest = queue.filter((_, i) => i !== currentSongIndex);
            setQueue([current, ...shuffleArray(rest)]);
        } else {
            // Revert to original order, keeping current song at the top
            const current = currentSong;
            if (current) {
                const originalIndex = originalQueue.findIndex(s => s.id === current.id);
                const reordered = originalQueue.slice(originalIndex);
                setQueue(reordered);
            } else {
                setQueue(originalQueue);
            }
        }
        return newShuffleState;
    });
  }

  const toggleRepeat = () => {
    setRepeatMode(prev => {
        if (prev === 'none') return 'all';
        if (prev === 'all') return 'one';
        return 'none';
    })
  }

  return (
    <MusicContext.Provider value={{ 
        songs, 
        currentSong, 
        queue, 
        originalQueue,
        playSong, 
        playNextSong,
        playPreviousSong,
        addToQueue,
        loadMusic: loadMusicFromHandle,
        rescanMusic,
        clearLibrary,
        hasAccess,
        isLoading,
        isPlaying,
        audioRef,
        analyser,
        play,
        pause,
        isShuffled,
        repeatMode,
        toggleShuffle,
        toggleRepeat
    }}>
      {children}
    </MusicContext.Provider>
  );
};
