
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Song, Playlist, AppData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from '@/lib/idb';
import { useIsMobile } from '@/hooks/use-mobile';
import { arrayMove } from '@dnd-kit/sortable';


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
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, from: number, to: number) => Promise<void>;
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
  reorderQueue: (from: number, to: number) => void;
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
    if (request) {
        // This should only be called following a user gesture.
        try {
            return (await directoryHandle.requestPermission(options)) === 'granted';
        } catch (error) {
            console.error("Permission request failed, likely not triggered by a user gesture.", error);
            return false;
        }
    }
    // "query" is the only method that doesn't require user gesture
    const state = await directoryHandle.queryPermission(options);
    return state === 'granted';
}

async function getFileHandleFromPath(dirHandle: FileSystemDirectoryHandle, path: string[]): Promise<FileSystemFileHandle | null> {
    let currentDir = dirHandle;
    try {
        for (let i = 0; i < path.length - 1; i++) {
            currentDir = await currentDir.getDirectoryHandle(path[i]);
        }
        const fileName = path[path.length - 1];
        return await currentDir.getFileHandle(fileName);
    } catch (error) {
        console.error(`Error getting file handle for path: ${path.join('/')}`, error);
        return null;
    }
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
  const [currentlyPlayingUrl, setCurrentlyPlayingUrl] = useState<string | null>(null);
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
  const isMobile = useIsMobile();


  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const loadMusicFromHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle, isFullRescan = false) => {
    if (!workerRef.current || isScanning) return;
    
    setIsScanning(true);
    
    if (isFullRescan) {
      setSongs([]);
    }
    
    await set('directoryHandle', dirHandle);
    storedHandle = dirHandle;
    setHasAccess(true);
    
    const currentSongs = isFullRescan ? [] : await get<Song[]>('songs') || [];

    workerRef.current.postMessage({
        type: 'SCAN_START',
        payload: {
            directoryHandle: dirHandle,
            existingSongIds: currentSongs.map(s => s.id)
        }
    });

    if (isFullRescan && !isMobile) {
        setIsLoading(false);
    }
  }, [isScanning, isMobile]);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/music-scanner.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (event: MessageEvent<{ type: string; payload: any }>) => {
        const { type, payload } = event.data;
        if (type === 'SCAN_COMPLETE') {
            const { newSongs, removedSongIds } = payload;

            let updated = false;

            if (newSongs.length > 0) {
                setSongs(prevSongs => {
                    const existingIds = new Set(prevSongs.map(s => s.id));
                    const trulyNew = newSongs.filter((s: Song) => !existingIds.has(s.id));
                    if (trulyNew.length === 0) return prevSongs;
                    updated = true;
                    const updatedSongs = [...prevSongs, ...trulyNew];
                    set('songs', updatedSongs);
                    return updatedSongs;
                });
                 toast({
                    title: 'Library Updated',
                    description: `Found ${newSongs.length} new song(s).`,
                });
            }

            if(removedSongIds.length > 0) {
                updated = true;
                setSongs(prevSongs => {
                    const updatedSongs = prevSongs.filter(s => !removedSongIds.includes(s.id));
                    set('songs', updatedSongs);
                    return updatedSongs;
                });
                 toast({
                    title: 'Library Cleaned',
                    description: `Removed ${removedSongIds.length} unavailable song(s).`,
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


  const play = useCallback(() => {
    if (audioRef.current) {
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume();
        }
        audioRef.current.play().catch(e => console.error("Playback failed", e));
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
    }
  }, []);

  const playSong = useCallback(async (song: Song, newQueue?: Song[]) => {
    if (!storedHandle || !audioRef.current) return;

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    const fileHandle = await getFileHandleFromPath(storedHandle, song.path);
    if (!fileHandle) {
        toast({ title: 'File not found', description: 'Could not find the audio file for this song.', variant: 'destructive'});
        return;
    }

    const file = await fileHandle.getFile();
    if (currentlyPlayingUrl) {
        URL.revokeObjectURL(currentlyPlayingUrl);
    }
    const url = URL.createObjectURL(file);

    setCurrentSong(song);
    setCurrentlyPlayingUrl(url);
    audioRef.current.src = url;
    audioRef.current.load();
    audioRef.current.play().catch(e => {
        // "The play() request was interrupted..." error is benign and can be ignored.
        if (e.name !== 'AbortError') {
            console.error("Playback failed", e)
        }
    });
    
    const songsToQueue = newQueue || songs.slice(songs.findIndex(s => s.id === song.id));
    setOriginalQueue(songsToQueue);

    if (isShuffled) {
        const shuffledQueue = shuffleArray(songsToQueue.filter(s => s.id !== song.id));
        setQueue([song, ...shuffledQueue]);
    } else {
        setQueue(songsToQueue);
    }
  }, [songs, isShuffled, currentlyPlayingUrl, toast]);

  const playNextSong = useCallback(() => {
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
        // End of queue, just stop.
        setIsPlaying(false); 
        return; 
      }
    }
    
    playSong(queue[nextIndex], queue);
  }, [currentSong, queue, repeatMode, playSong, play]);


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
    audioRef.current?.addEventListener('ended', playNextSong);


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
        audioRef.current?.removeEventListener('ended', playNextSong);
    }
  }, [playNextSong]);

  const playPreviousSong = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      playSong(queue[currentIndex - 1], queue);
    }
  }, [currentSong, queue, playSong]);

  // Media Session API integration
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (currentSong) {
        const artwork = currentSong.coverArt ? [{ src: currentSong.coverArt, sizes: '512x512', type: 'image/jpeg' }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist,
          album: currentSong.album,
          artwork: artwork
        });
      }
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentSong, isPlaying]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('previoustrack', playPreviousSong);
        navigator.mediaSession.setActionHandler('nexttrack', playNextSong);
    }
  }, [play, pause, playPreviousSong, playNextSong]);


  // Initial load effect
  useEffect(() => {
    const checkAccessAndLoad = async () => {
        setIsLoading(true);
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
                        // Don't wait for this, let it run in the background
                        loadMusicFromHandle(handle, false);
                    }
                } else {
                     setHasAccess(false);
                }
            }
             if (playbackState && storedSongs && storedSongs.length > 0) {
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
                    if (restoredCurrentSong && storedHandle && await verifyPermission(storedHandle)) {
                        const fileHandle = await getFileHandleFromPath(storedHandle, restoredCurrentSong.path);
                        if(fileHandle) {
                            const file = await fileHandle.getFile();
                            // Revoke previous URL if it exists
                            if (currentlyPlayingUrl) URL.revokeObjectURL(currentlyPlayingUrl);
                            const url = URL.createObjectURL(file);
                            setCurrentlyPlayingUrl(url);
                            audioRef.current.src = url;
                            audioRef.current.currentTime = progress || 0;
                        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

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
        if (await verifyPermission(storedHandle, true)) {
            toast({
                title: 'Rescanning Library',
                description: 'Looking for new music in the background.',
            });
            await loadMusicFromHandle(storedHandle, false);
        } else {
             toast({
                title: 'Permission Denied',
                description: 'Permission to access the folder was denied.',
                variant: 'destructive'
            })
        }
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
  
  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
            return { ...p, songIds: p.songIds.filter(id => id !== songId) };
        }
        return p;
    });
    setPlaylists(updatedPlaylists);
    await set('playlists', updatedPlaylists);
  }

  const reorderPlaylist = async (playlistId: string, from: number, to: number) => {
    setPlaylists(currentPlaylists => {
      const playlistIndex = currentPlaylists.findIndex(p => p.id === playlistId);
      if (playlistIndex === -1) return currentPlaylists;
      
      const playlistToReorder = currentPlaylists[playlistIndex];
      const reorderedSongIds = arrayMove(playlistToReorder.songIds, from, to);
      
      const updatedPlaylist = { ...playlistToReorder, songIds: reorderedSongIds };
      
      const newPlaylists = [...currentPlaylists];
      newPlaylists[playlistIndex] = updatedPlaylist;
      
      set('playlists', newPlaylists);
      return newPlaylists;
    });
  };

  const getPlaylistSongs = (playlistId: string): Song[] => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return [];
    // Ensure the order from the playlist is respected
    return playlist.songIds.map(songId => songs.find(s => s.id === songId)).filter(Boolean) as Song[];
  }


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
  
  const reorderQueue = (from: number, to: number) => {
    setQueue(currentQueue => {
        const newQueue = arrayMove(currentQueue, from, to);
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
        removeSongFromPlaylist,
        reorderPlaylist,
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

    