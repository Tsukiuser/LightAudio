
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import type { Song, Playlist, AppData } from '@/lib/types';
// @ts-ignore
import * as music from 'music-metadata-browser';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from '@/lib/idb';
import { useRouter } from 'next/navigation';

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
  loadMusic: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  rescanMusic: () => Promise<void>;
  clearLibrary: () => void;
  exportData: () => void;
  importData: (file: File) => void;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);


  useEffect(() => {
    // Ensure this runs only once
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
        // Do not remove the audio element from the body on cleanup
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

    // After songs are loaded, restore playback state
    const savedState = loadPlaybackState();
    if (savedState) {
        if (savedState.isShuffled) setIsShuffled(savedState.isShuffled);
        if (savedState.repeatMode) setRepeatMode(savedState.repeatMode);
        if (savedState.volume !== undefined && audioRef.current) audioRef.current.volume = savedState.volume;

        const restoredQueue = (savedState.queueIds || [])
            .map(id => newSongs.find(s => s.id === id))
            .filter((s): s is Song => !!s);
        setQueue(restoredQueue);

        const restoredOriginalQueue = (savedState.originalQueueIds || [])
            .map(id => newSongs.find(s => s.id === id))
            .filter((s): s is Song => !!s);
        setOriginalQueue(restoredOriginalQueue);

        if (savedState.currentSongId) {
            const restoredSong = newSongs.find(s => s.id === savedState.currentSongId);
            if (restoredSong) {
                setCurrentSong(restoredSong);
                if (audioRef.current) {
                    audioRef.current.src = restoredSong.url;
                    audioRef.current.load();
                    if (savedState.progress) {
                        const onLoadedData = () => {
                            if(audioRef.current) {
                                audioRef.current.currentTime = savedState.progress ?? 0;
                                audioRef.current.removeEventListener('loadeddata', onLoadedData);
                            }
                        }
                        audioRef.current.addEventListener('loadeddata', onLoadedData);
                    }
                }
            }
        }
    }
    
    setIsLoading(false);
    if (newSongs.length > 0 && !isInitialLoad) {
        toast({
            title: 'Library Updated',
            description: `Found ${newSongs.length} songs.`,
        })
    }
  }, [toast]);

  // Effect to save state whenever it changes
    useEffect(() => {
        const saveState = () => {
            savePlaybackState({
                currentSongId: currentSong?.id,
                queueIds: queue.map(s => s.id),
                originalQueueIds: originalQueue.map(s => s.id),
                isShuffled,
                repeatMode,
                progress: audioRef.current?.currentTime,
                volume: audioRef.current?.volume
            });
        };

        const interval = setInterval(saveState, 5000); // Save every 5 seconds
        window.addEventListener('beforeunload', saveState); // Save on closing tab

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', saveState);
            saveState(); // Final save on component unmount
        };
    }, [currentSong, queue, originalQueue, isShuffled, repeatMode]);

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
      await del('playlists');
      localStorage.removeItem('playbackState');
      setPlaylists([]);
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
            const storedPlaylists = await get<Playlist[]>('playlists');
            if (storedPlaylists) {
                setPlaylists(storedPlaylists);
            }
        } catch (e) {
            console.error("Could not retrieve data from IndexedDB", e);
            setIsLoading(false);
        }
    };
    checkAccess();
  }, [loadMusicFromHandle]);

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
      // Navigate away if viewing the deleted playlist is complex here. Handled in component.
    }
  }

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    let playlistName = '';
    const updatedPlaylists = playlists.map(p => {
        if (p.id === playlistId) {
            playlistName = p.name;
            if (p.songIds.includes(songId)) {
                return p; // Song already exists, do nothing
            }
            return { ...p, songIds: [...p.songIds, songId] };
        }
        return p;
    });

    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.songIds.includes(songId)) {
        toast({
            title: 'Song Added',
            description: `Added to "${playlistName}".`,
        });
        setPlaylists(updatedPlaylists);
        await set('playlists', updatedPlaylists);
    } else if (playlist) {
        toast({
            title: 'Song Already in Playlist',
            description: 'This song is already in the selected playlist.',
            variant: 'default'
        });
    }
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
        // Don't stop, just loop back to start of queue if not repeating all
        nextIndex = 0;
        setCurrentSong(queue[nextIndex]);
        pause(); // stop playing
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

  const toggleShuffle = () => {
    setIsShuffled(prev => {
        const newShuffleState = !prev;
        if (!currentSong) return newShuffleState;

        if (newShuffleState) {
            // Shuffle the rest of the queue, keeping the current song at the top
            const currentSongIndex = queue.findIndex(s => s.id === currentSong.id);
            const current = queue[currentSongIndex];
            const rest = queue.filter((_, i) => i !== currentSongIndex);
            setQueue([current, ...shuffleArray(rest)]);
        } else {
            // Revert to original order, starting from the current song
             const originalIndex = originalQueue.findIndex(s => s.id === currentSong.id);
             if (originalIndex !== -1) {
                const reordered = originalQueue.slice(originalIndex);
                setQueue(reordered);
             } else {
                // If current song not in original queue (e.g. from search)
                // just place it at the top of the unshuffled queue
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
        loadMusic: loadMusicFromHandle,
        rescanMusic,
        clearLibrary,
        exportData,
        importData,
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
