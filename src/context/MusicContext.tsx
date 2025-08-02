
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Song } from '@/lib/types';
// @ts-ignore
import * as music from 'music-metadata-browser';
import { generatePlaylist } from '@/ai/flows/playlist-flow';
import { useToast } from '@/hooks/use-toast';

interface MusicContextType {
  songs: Song[];
  currentSong: Song | null;
  userQueue: Song[];
  aiQueue: Song[];
  playSong: (song: Song, newQueue?: Song[]) => void;
  playNextSong: () => void;
  playPreviousSong: () => void;
  addToQueue: (song: Song) => void;
  loadMusic: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  hasAccess: boolean;
  isLoading: boolean;
  isAiPlaylistEnabled: boolean;
  setAiPlaylistEnabled: (enabled: boolean) => void;
  isGeneratingPlaylist: boolean;
}

export const MusicContext = createContext<MusicContextType | null>(null);

const PERMISSION_KEY = 'localbeat_music_folder_permission';

async function getPermission(directoryHandle: FileSystemDirectoryHandle) {
    const options = { mode: 'read' };
    if ((await directoryHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await directoryHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
}

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [userQueue, setUserQueue] = useState<Song[]>([]);
  const [aiQueue, setAiQueue] = useState<Song[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listeningHistory, setListeningHistory] = useState<Song[]>([]);
  const [isAiPlaylistEnabled, setIsAiPlaylistEnabled] = useState(false);
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const { toast } = useToast();

  const loadMusicFromHandle = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    setIsLoading(true);
    const permissionGranted = await getPermission(dirHandle);
    if (!permissionGranted) {
        console.error("Permission denied to read directory.");
        setHasAccess(false);
        setIsLoading(false);
        return;
    }

    setHasAccess(true);
    setDirectoryHandle(dirHandle);
    
    // @ts-ignore
    localStorage.setItem(PERMISSION_KEY, 'granted'); // Simplified for this example. For production, you'd store the handle in IndexedDB.

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
                    : 'https://placehold.co/300x300.png';

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
  }, []);

  useEffect(() => {
    // This is a simplified way to handle permissions. 
    // In a real app, you would use IndexedDB to store the directory handle
    // so you don't have to ask for permission every time.
    const checkAccess = async () => {
        const hasPermission = localStorage.getItem(PERMISSION_KEY);
        if (hasPermission !== 'granted') {
             setIsLoading(false);
             setHasAccess(false);
        } else {
            // This is where you would retrieve the handle from IndexedDB.
            // Since we don't have that, we just mark as not having access
            // and the user will have to grant it again.
            setIsLoading(false);
            setHasAccess(false);
            localStorage.removeItem(PERMISSION_KEY); // Force re-request
        }
    };
    checkAccess();
  }, []);

  const setAiPlaylistEnabled = (enabled: boolean) => {
    setIsAiPlaylistEnabled(enabled);
    if (!enabled) {
        setAiQueue([]);
        // if user queue is empty, clear current song
        if (userQueue.length === 0) {
            setCurrentSong(null);
        } else {
            setCurrentSong(userQueue[0]);
        }
    }
  }

  const triggerAiPlaylistGeneration = useCallback(async () => {
    if (listeningHistory.length === 0 || songs.length === 0 || isGeneratingPlaylist) {
      return;
    }
    setIsGeneratingPlaylist(true);
    try {
        const libraryForAi = songs.map(s => ({id: s.id, title: s.title, artist: s.artist, album: s.album}));
        const historyForAi = listeningHistory.map(s => ({id: s.id, title: s.title, artist: s.artist, album: s.album}));
      
        const result = await generatePlaylist({ history: historyForAi, library: libraryForAi });
      
        const newAiSongIds = result.playlist;
        const newAiSongs = songs.filter(s => newAiSongIds.includes(s.id));
        setAiQueue(newAiSongs);

        if (!currentSong) {
            setCurrentSong(newAiSongs[0] || null);
        }
        
    } catch (error) {
      console.error("Failed to generate AI playlist:", error);
      toast({
          title: "AI Playlist Error",
          description: "Could not generate a playlist. Please try again later.",
          variant: "destructive"
      });
    } finally {
        setIsGeneratingPlaylist(false);
    }
  }, [listeningHistory, songs, isGeneratingPlaylist, toast, currentSong]);


  useEffect(() => {
    if (isAiPlaylistEnabled && (listeningHistory.length > 0 || aiQueue.length === 0)) {
        const handle = setTimeout(() => {
            triggerAiPlaylistGeneration();
        }, 2000); // Debounce AI call
        return () => clearTimeout(handle);
    }
  }, [isAiPlaylistEnabled, listeningHistory, triggerAiPlaylistGeneration, aiQueue.length]);


  const playSong = (song: Song, newQueue?: Song[]) => {
    // Add to listening history
    setListeningHistory(prev => [song, ...prev].slice(0, 20));

    setCurrentSong(song);

    if (isAiPlaylistEnabled) {
        // When AI is on, playing a song just sets it as current, doesn't change the queue
        // unless it's not already in one of the queues.
        const inUserQueue = userQueue.some(s => s.id === song.id);
        const inAiQueue = aiQueue.some(s => s.id === song.id);
        if(!inUserQueue && !inAiQueue) {
            setUserQueue(prev => [song, ...prev]);
        }
    } else {
        if (newQueue) {
            setUserQueue(newQueue);
        } else {
            const songIndex = songs.findIndex(s => s.id === song.id);
            if(songIndex !== -1) {
                setUserQueue(songs.slice(songIndex));
            } else {
                setUserQueue([song]);
            }
        }
        setAiQueue([]);
    }
  };

  const playNextSong = () => {
    const fullQueue = [...userQueue, ...aiQueue];
    if (!currentSong || fullQueue.length === 0) return;

    const currentIndex = fullQueue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1 || currentIndex === fullQueue.length - 1) {
        // If it's the last song and AI is enabled, generate more
        if (isAiPlaylistEnabled) {
            triggerAiPlaylistGeneration();
        } else {
            // otherwise, stop playback
             setCurrentSong(null);
        }
        return;
    }
    const nextSong = fullQueue[currentIndex + 1];
    setCurrentSong(nextSong);
    setListeningHistory(prev => [nextSong, ...prev].slice(0, 20));
  };

  const playPreviousSong = () => {
    const fullQueue = [...userQueue, ...aiQueue];
    if (!currentSong || fullQueue.length === 0) return;
    const currentIndex = fullQueue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      const prevSong = fullQueue[currentIndex - 1];
      setCurrentSong(prevSong);
      setListeningHistory(prev => [prevSong, ...prev].slice(0, 20));
    }
  };

  const addToQueue = (song: Song) => {
    setUserQueue(prevQueue => [...prevQueue, song]);
  }
  
  const queue = isAiPlaylistEnabled ? [...userQueue, ...aiQueue] : userQueue;

  return (
    <MusicContext.Provider value={{ 
        songs, 
        currentSong,
        userQueue,
        aiQueue,
        playSong, 
        playNextSong,
        playPreviousSong,
        addToQueue,
        loadMusic: loadMusicFromHandle,
        hasAccess,
        isLoading,
        isAiPlaylistEnabled,
        setAiPlaylistEnabled,
        isGeneratingPlaylist
    }}>
      {children}
    </MusicContext.Provider>
  );
};
