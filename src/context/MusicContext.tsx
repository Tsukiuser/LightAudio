
'use client';

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Song } from '@/lib/types';
// @ts-ignore
import * as music from 'music-metadata-browser';
import { useToast } from '@/hooks/use-toast';
import { get, set, del } from '@/lib/idb';

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

let storedHandle: FileSystemDirectoryHandle | null = null; 

async function verifyPermission(directoryHandle: FileSystemDirectoryHandle) {
    const options = { mode: 'read' };
    if ((await directoryHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    // If permission is not granted, we need to request it again.
    // This will prompt the user.
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
