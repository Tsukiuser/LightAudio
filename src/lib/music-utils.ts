import type { Song, Album, Artist } from './types';

export function getAlbums(songs: Song[]): Album[] {
  if (!songs) return [];
  const albums = songs.reduce((acc, song) => {
    const albumName = song.album || 'Unknown Album';
    if (!acc[albumName]) {
      acc[albumName] = {
        name: albumName,
        artist: song.artist || 'Unknown Artist',
        coverArt: song.coverArt,
        songs: [],
      };
    }
    // Prioritize existing cover art over null
    if (song.coverArt && !acc[albumName].coverArt) {
        acc[albumName].coverArt = song.coverArt;
    }
    acc[albumName].songs.push(song);
    return acc;
  }, {} as Record<string, Album>);
  return Object.values(albums);
}

export function getArtists(songs: Song[]): Artist[] {
    if (!songs) return [];
    const albumsByArtist = songs.reduce((acc, song) => {
        const artistName = song.artist || 'Unknown Artist';
        if (!acc[artistName]) {
            acc[artistName] = {};
        }

        const albumName = song.album || 'Unknown Album';
        if (!acc[artistName][albumName]) {
            acc[artistName][albumName] = {
                name: albumName,
                artist: artistName,
                coverArt: song.coverArt,
                songs: []
            };
        }
        acc[artistName][albumName].songs.push(song);
        return acc;
    }, {} as Record<string, Record<string, Album>>);

    return Object.entries(albumsByArtist).map(([artistName, albums]) => {
      const allAlbums = Object.values(albums);
      const albumWithCover = allAlbums.find(a => !!a.coverArt);
      return {
        name: artistName,
        coverArt: albumWithCover ? albumWithCover.coverArt : null,
        albums: allAlbums
      }
    });
}
