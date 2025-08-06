
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Song, Playlist, AppData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from '@/lib/idb';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

type RepeatMode = 'none' | 'all' | 'one';
type PlaybackState = {
  currentSongId?: string;
  queueIds?: string[];
  originalQueueIds?: string[];
  isShuffled?: boolean;
  repeatMode?: RepeatMode;
  progress?: number;
  volume?: number;
}

interface MusicContextType {
  songs: Song[];
  playlists: Playlist[];
  createPlaylist: (name: string) => Promise<void>;
  renamePlaylist: (playlistId: string, newName: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  getPlaylistSongs: (playlistId: string) => Song[];
  currentSong: Song | null;
  queue: Song[];
  originalQueue: Song[];
  playSong: (song: Song, newQueue?: Song[]) => void;
  playNextSong: () => void;
  playPreviousSong: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  clearQueue: () => void;
  reorderQueue: (oldIndex: number, newIndex: number) => void;
  loadMusic: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  rescanMusic: () => Promise<void>;
  clearLibrary: () => void;
  exportData: () => void;
  importData: (file: File) => void;
  hasAccess: boolean;
  isLoading: boolean;
  isScanning: boolean;
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

async function verifyPermission(directoryHandle: FileSystemDirectoryHandle, request = false) {
    const options = { mode: 'read' as const };
    const state = await directoryHandle.queryPermission(options);
    if (state === 'granted') {
        return true;
    }
    // Only request permission if the user has triggered an action
    if (request) {
        try {
            if ((await directoryHandle.requestPermission(options)) === 'granted') {
                return true;
            }
        } catch (error) {
            // This can happen if the user denies permission or if the browser
            // blocks the request for security reasons (e.g., not a user gesture).
            console.error("Permission request failed", error);
            return false;
        }
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

const savePlaybackState = (state: PlaybackState) => {
    try {
        const stateToSave = {
            currentSongId: state.currentSongId,
            queueIds: state.queueIds,
            originalQueueIds: state.originalQueueIds,
            isShuffled: state.isShuffled,
            repeatMode: state.repeatMode,
            progress: state.progress,
            volume: state.volume,
        };
        localStorage.setItem('playbackState', JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Failed to save playback state", error);
    }
}

const loadPlaybackState = (): PlaybackState | null => {
    try {
        const savedState = localStorage.getItem('playbackState');
        if (savedState) {
            return JSON.parse(savedState);
        }
        return null;
    } catch (error) {
        console.error("Failed to load playback state", error);
        return null;
    }
}


export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Song[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();


  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/music-scanner.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (event: MessageEvent<{ type: string; payload: any }>) => {
        const { type, payload } = event.data;
        if (type === 'SCAN_COMPLETE') {
            const { newSongs } = payload;
            if (newSongs.length > 0) {
                setSongs(prevSongs => [...prevSongs, ...newSongs]);
                toast({
                    title: 'Library Updated',
                    description: `Found ${newSongs.length} new song(s).`,
                });
            }
            setIsScanning(false);
        } else if (type === 'SCAN_ERROR') {
            console.error('Scan worker error:', payload.error);
            toast({
                title: 'Scan Error',
                description: 'Could not scan the music folder.',
                variant: 'destructive',
            });
            setIsScanning(false);
        }
    };

    return () => {
        workerRef.current?.terminate();
    };
  }, [toast]);


  useEffect(() => {
    if (audioRef.current) return;

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
    }
  }, []);

  const loadMusicFromHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle, isTriggeredByUser = false) => {
    if (!workerRef.current) return;
    
    setIsScanning(true);
    if(isTriggeredByUser) {
        setSongs([]); // Clear existing songs for a full rescan triggered by user
    }
    
    await set('directoryHandle', dirHandle);
    storedHandle = dirHandle;
    setHasAccess(true);

    workerRef.current.postMessage({
        type: 'SCAN_START',
        payload: {
            directoryHandle: dirHandle,
            existingSongIds: isTriggeredByUser ? [] : songs.map(s => s.id)
        }
    });

    if (isTriggeredByUser) {
        setIsLoading(false);
    }
  }, [songs]);


  // Initial load effect
  useEffect(() => {
    const checkAccessAndLoad = async () => {
        try {
            const [handle, storedPlaylists, storedSongs, playbackState] = await Promise.all([
                get<FileSystemDirectoryHandle>('directoryHandle'),
                get<Playlist[]>('playlists'),
                get<Song[]>('songs'),
                loadPlaybackState()
            ]);

            if (storedPlaylists) setPlaylists(storedPlaylists);
            if (storedSongs) setSongs(storedSongs);

            if (handle) {
                storedHandle = handle;
                if (await verifyPermission(handle, false)) {
                    setHasAccess(true);
                    if (!isMobile) {
                        // Start background scan on desktop
                        loadMusicFromHandle(handle, false);
                    }
                } else {
                     setHasAccess(false);
                }
            }
             if (playbackState && storedSongs) {
                const { currentSongId, queueIds, originalQueueIds, isShuffled, repeatMode, progress, volume } = playbackState;

                const restoredQueue = queueIds?.map(id => storedSongs.find(s => s.id === id)).filter(Boolean) as Song[] || [];
                const restoredOriginalQueue = originalQueueIds?.map(id => storedSongs.find(s => s.id === id)).filter(Boolean) as Song[] || [];
                const restoredCurrentSong = storedSongs.find(s => s.id === currentSongId) || null;

                setQueue(restoredQueue);
                setOriginalQueue(restoredOriginalQueue);
                setCurrentSong(restoredCurrentSong);
                setIsShuffled(isShuffled || false);
                setRepeatMode(repeatMode || 'none');
                
                if (audioRef.current) {
                    if (restoredCurrentSong) {
                         audioRef.current.src = restoredCurrentSong.url;
                         audioRef.current.currentTime = progress || 0;
                    }
                    audioRef.current.volume = volume || 0.5;
                }
            }
        } catch (e) {
            console.error("Could not retrieve data from IndexedDB", e);
        } finally {
            setIsLoading(false);
        }
    };

    if (isMobile !== undefined) {
      checkAccessAndLoad();
    }
  }, [isMobile, loadMusicFromHandle]);

  // Effect to save songs to IndexedDB when they change
  useEffect(() => {
      if(songs.length > 0 && !isLoading) {
          set('songs', songs);
      }
  }, [songs, isLoading]);


    useEffect(() => {
        const saveState = () => {
            if (audioRef.current) {
                savePlaybackState({
                    currentSongId: currentSong?.id,
                    queueIds: queue.map(s => s.id),
                    originalQueueIds: originalQueue.map(s => s.id),
                    isShuffled,
                    repeatMode,
                    progress: audioRef.current?.currentTime,
                    volume: audioRef.current?.volume
                });
            }
        };

        const interval = setInterval(saveState, 5000);
        window.addEventListener('beforeunload', saveState);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', saveState);
            saveState();
        };
    }, [currentSong, queue, originalQueue, isShuffled, repeatMode]);

  const rescanMusic = useCallback(async () => {
    if (storedHandle) {
        toast({
            title: 'Rescanning Library',
            description: 'Looking for new music in the background.',
        });
        await loadMusicFromHandle(storedHandle, true);
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
      setOriginalQueue([]);
      setPlaylists([]);
      setHasAccess(false);
      storedHandle = null;
      await del('directoryHandle');
      await del('playlists');
      await del('songs');
      localStorage.removeItem('playbackState');
      if (audioRef.current) {
        audioRef.current.src = '';
      }
  }, []);

  const createPlaylist = async (name: string) => {
    const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name,
        songIds: [],
        createdAt: new Date().toISOString(),
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    await set('playlists', updatedPlaylists);
    toast({
        title: 'Playlist Created',
        description: `"${name}" has been created.`,
    })
  }

  const renamePlaylist = async (playlistId: string, newName: string) => {
    let oldName = '';
    const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
            oldName = p.name;
            return { ...p, name: newName };
        }
        return p;
    });
    setPlaylists(updatedPlaylists);
    await set('playlists', updatedPlaylists);
    toast({
        title: 'Playlist Renamed',
        description: `"${oldName}" is now "${newName}".`,
    });
  }

  const deletePlaylist = async (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
      setPlaylists(updatedPlaylists);
      await set('playlists', updatedPlaylists);
      toast({
        title: 'Playlist Deleted',
        description: `"${playlist.name}" has been deleted.`,
        variant: 'destructive'
      });
    }
  }

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    let playlistName = '';
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    if (playlist.songIds.includes(songId)) {
        toast({
            title: 'Song Already in Playlist',
            description: 'This song is already in the selected playlist.',
        });
        return;
    }
    
    const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
            playlistName = p.name;
            return { ...p, songIds: [...p.songIds, songId] };
        }
        return p;
    });

    setPlaylists(updatedPlaylists);
    await set('playlists', updatedPlaylists);
    toast({
        title: 'Song Added',
        description: `Added to "${playlistName}".`,
    });
  }

  const getPlaylistSongs = (playlistId: string): Song[] => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    return playlist.songIds.map(songId => songs.find(s => s.id === songId)).filter(Boolean) as Song[];
  }


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
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  }

  const pause = () => {
    if (audioRef.current) {
        audioRef.current.pause();
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
        if (audioRef.current) {
           audioRef.current.currentTime = audioRef.current.duration;
           pause();
        }
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
    if (!originalQueue.find(s => s.id === song.id)) {
        setOriginalQueue(prevOrig => [...prevOrig, song]);
    }
  }

  const removeFromQueue = (songId: string) => {
      setQueue(prev => prev.filter(s => s.id !== songId));
      setOriginalQueue(prev => prev.filter(s => s.id !== songId));
  }
  
  const reorderQueue = (oldIndex: number, newIndex: number) => {
    setQueue(currentQueue => {
        const newQueue = [...currentQueue];
        const [movedItem] = newQueue.splice(oldIndex, 1);
        newQueue.splice(newIndex, 0, movedItem);
        return newQueue;
    });
  }

  const clearQueue = () => {
      if (currentSong) {
          const newQueue = queue.filter(s => s.id === currentSong.id);
          setQueue(newQueue);
      } else {
          setQueue([]);
          setOriginalQueue([]);
      }
      toast({
          title: "Queue Cleared",
          description: "The 'Up Next' list has been cleared.",
      })
  }

  const toggleShuffle = () => {
    setIsShuffled(prev => {
        const newShuffleState = !prev;
        if (!currentSong) return newShuffleState;

        if (newShuffleState) {
            const currentSongInQueue = queue.find(s => s.id === currentSong.id);
            if (!currentSongInQueue) return newShuffleState;
            const rest = queue.filter((s) => s.id !== currentSong.id);
            setQueue([currentSongInQueue, ...shuffleArray(rest)]);
        } else {
             const originalIndex = originalQueue.findIndex(s => s.id === currentSong.id);
             if (originalIndex !== -1) {
                const reordered = [...originalQueue];
                setQueue(reordered);
             } else {
                setQueue([currentSong, ...originalQueue.filter(s => s.id !== currentSong.id)])
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

  const exportData = () => {
    const data: AppData = {
        playlists: playlists,
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lightaudio_backup_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const jsonString = event.target?.result as string;
              const data: AppData = JSON.parse(jsonString);

              if (data.playlists && Array.isArray(data.playlists)) {
                  setPlaylists(data.playlists);
                  await set('playlists', data.playlists);
                  toast({
                      title: 'Import Successful',
                      description: `Restored ${data.playlists.length} playlists.`,
                  });
              } else {
                throw new Error('Invalid file format.');
              }
          } catch (error) {
              console.error('Error importing data:', error);
              toast({
                  title: 'Import Failed',
                  description: 'The selected file is not a valid backup file.',
                  variant: 'destructive',
              });
          }
      };
      reader.readAsText(file);
  };


  return (
    <MusicContext.Provider value={{ 
        songs, 
        playlists,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addSongToPlaylist,
        getPlaylistSongs,
        currentSong, 
        queue, 
        originalQueue,
        playSong, 
        playNextSong,
        playPreviousSong,
        addToQueue,
        removeFromQueue,
        clearQueue,
        reorderQueue,
        loadMusic: (handle) => loadMusicFromHandle(handle, true),
        rescanMusic,
        clearLibrary,
        exportData,
        importData,
        hasAccess,
        isLoading,
        isScanning,
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

    