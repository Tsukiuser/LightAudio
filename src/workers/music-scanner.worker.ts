
/// <reference lib="webworker" />
import * as music from 'music-metadata-browser';
import type { Song } from '@/lib/types';
import { formatDuration } from '@/lib/utils';


declare const self: DedicatedWorkerGlobalScope;

async function* getFileHandlesRecursively(entry: FileSystemDirectoryHandle, path: string[] = []): AsyncGenerator<{handle: FileSystemFileHandle, path: string[]}> {
    try {
        for await (const child of entry.values()) {
            const newPath = [...path, child.name];
            if (child.kind === 'file' && (child.name.endsWith('.mp3') || child.name.endsWith('.flac') || child.name.endsWith('.m4a') || child.name.endsWith('.wav') || child.name.endsWith('.ogg'))) {
                yield { handle: child, path: newPath };
            } else if (child.kind === 'directory') {
                yield* getFileHandlesRecursively(child, newPath);
            }
        }
    } catch(e) {
        console.warn(`Could not read directory ${entry.name}`, e);
        self.postMessage({ type: 'SCAN_ERROR', payload: { error: `Could not read directory: ${entry.name}` } });
    }
}

self.onmessage = async (event: MessageEvent<{ type: string; payload: any }>) => {
    const { type, payload } = event.data;

    if (type === 'SCAN_START') {
        const { directoryHandle, existingSongIds } = payload;
        const newSongs: Song[] = [];
        const existingIdSet = new Set(existingSongIds);
        const foundSongIds = new Set<string>();

        try {
            for await (const { handle: fileHandle, path } of getFileHandlesRecursively(directoryHandle)) {
                const file = await fileHandle.getFile();
                const songId = file.name + '-' + file.size;
                foundSongIds.add(songId);

                if (existingIdSet.has(songId)) {
                    continue; // Skip already processed files
                }

                try {
                    const metadata = await music.parseBlob(file, { skipCovers: false });
                    
                    const coverArt = metadata.common.picture?.[0] 
                        ? `data:${metadata.common.picture[0].format};base64,${metadata.common.picture[0].data.toString('base64')}`
                        : null;

                    newSongs.push({
                        id: songId,
                        path: path,
                        title: metadata.common.title || file.name,
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        duration: formatDuration(metadata.format.duration || 0),
                        coverArt: coverArt,
                    });

                } catch(e) {
                    console.warn(`Could not read metadata for ${fileHandle.name}`, e);
                }
            }

            const removedSongIds = existingSongIds.filter((id: string) => !foundSongIds.has(id));
            
            self.postMessage({ type: 'SCAN_COMPLETE', payload: { newSongs, removedSongIds } });

        } catch (e) {
            console.error("Error scanning music files in worker", e);
            self.postMessage({ type: 'SCAN_ERROR', payload: { error: 'Failed to scan files.' } });
        }
    }
};

export {};
