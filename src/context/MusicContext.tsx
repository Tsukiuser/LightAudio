
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
  hasAccess: boolean;
  isLoading: boolean;
}

export const MusicContext = createContext<MusicContextType | null>(null);

const PERMISSION_KEY = 'lightaudio_music_folder_permission';

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
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
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
        hasAccess,
        isLoading
    }}>
      {children}
    </MusicContext.Provider>
  );
};
