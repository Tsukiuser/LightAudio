
/// <reference lib="webworker" />
import * as music from 'music-metadata-browser';
import type { Song } from '@/lib/types';
import { formatDuration } from '@/lib/utils';


declare const self: DedicatedWorkerGlobalScope;

async function* getFilesRecursively(entry: FileSystemDirectoryHandle): AsyncGenerator<FileSystemFileHandle> {
    try {
        for await (const child of entry.values()) {
            if (child.kind === 'file' && (child.name.endsWith('.mp3') || child.name.endsWith('.flac') || child.name.endsWith('.m4a') || child.name.endsWith('.wav') || child.name.endsWith('.ogg'))) {
                yield child;
            } else if (child.kind === 'directory') {
                yield* getFilesRecursively(child);
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

        try {
            for await (const fileHandle of getFilesRecursively(directoryHandle)) {
                const file = await fileHandle.getFile();
                const songId = file.name + '-' + file.size;

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
                        title: metadata.common.title || file.name,
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        duration: formatDuration(metadata.format.duration || 0),
                        coverArt: coverArt,
                        url: URL.createObjectURL(file),
                    });

                } catch(e) {
                    console.warn(`Could not read metadata for ${fileHandle.name}`, e);
                }
            }
            
            self.postMessage({ type: 'SCAN_COMPLETE', payload: { newSongs } });

        } catch (e) {
            console.error("Error scanning music files in worker", e);
            self.postMessage({ type: 'SCAN_ERROR', payload: { error: 'Failed to scan files.' } });
        }
    }
};

export {};
