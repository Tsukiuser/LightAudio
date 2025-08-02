
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Song } from '@/lib/types';
// @ts-ignore
import * as music from 'music-metadata-browser';
import { useToast } from '@/hooks/use-toast';

interface MusicContextType {
  songs: Song[];
  currentSong: Song | null;
  queue: Song[];
  playSong: (song: Song, newQueue?: Song[]) => void;
  playNextSong: () => void;
  playPreviousSong: () => void;
  addToQueue: (song: Song) => void;
  loadMusic: (directoryHandle: FileSystemDirectoryHandle) => Promise<void>;
  rescanMusic: () => Promise<void>;
  clearLibrary: () => void;
  hasAccess: boolean;
  isLoading: boolean;
}

export const MusicContext = createContext<MusicContextType | null>(null);

const PERMISSION_KEY = 'lightaudio_music_folder_permission';

// This is a simplified way to handle permissions and the directory handle.
// For a production app, you would use IndexedDB to store the directory handle
// for a more persistent and robust solution.
let storedHandle: FileSystemDirectoryHandle | null = null; 

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
  const [queue, setQueue] = useState<Song[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    storedHandle = dirHandle; // Store the handle
    localStorage.setItem(PERMISSION_KEY, 'granted');

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
    if (newSongs.length > 0) {
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
  
  const clearLibrary = () => {
      setSongs([]);
      setCurrentSong(null);
      setQueue([]);
      setHasAccess(false);
      storedHandle = null;
      localStorage.removeItem(PERMISSION_KEY);
  }

  useEffect(() => {
    // We only check for the permission key, but don't try to load anything.
    // The handle is stored in-memory. If the user refreshes, they need to grant access again.
    // This is a limitation of not using IndexedDB for the handle.
    const checkAccess = () => {
        const hasPermission = localStorage.getItem(PERMISSION_KEY);
        if (hasPermission !== 'granted' || !storedHandle) {
             setIsLoading(false);
             setHasAccess(false);
        } else {
             setHasAccess(true);
             // If we have access, we should probably load the music
             rescanMusic();
        }
    };
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playSong = (song: Song, newQueue?: Song[]) => {
    setCurrentSong(song);
    if (newQueue) {
      setQueue(newQueue);
    } else {
      // If no queue is provided, play the single song.
      const songIndex = songs.findIndex(s => s.id === song.id);
      if(songIndex !== -1) {
        setQueue(songs.slice(songIndex));
      } else {
        setQueue([song]);
      }
    }
  };

  const playNextSong = () => {
    if (!currentSong || queue.length === 0) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1 || currentIndex === queue.length - 1) {
      // It's the last song, so stop playback
      setCurrentSong(null);
      return;
    }
    setCurrentSong(queue[currentIndex + 1]);
  };

  const playPreviousSong = () => {
    if (!currentSong || queue.length === 0) return;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      setCurrentSong(queue[currentIndex - 1]);
    }
  };

  const addToQueue = (song: Song) => {
    setQueue(prevQueue => [...prevQueue, song]);
  }

  return (
    <MusicContext.Provider value={{ 
        songs, 
        currentSong, 
        queue, 
        playSong, 
        playNextSong,
        playPreviousSong,
        addToQueue,
        loadMusic: loadMusicFromHandle,
        rescanMusic,
        clearLibrary,
        hasAccess,
        isLoading
    }}>
      {children}
    </MusicContext.Provider>
  );
};
