
export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverArt: string | null;
  url: string;
};

export type Album = {
  name: string;
  artist: string;
  coverArt: string | null;
  songs: Song[];
};

export type Artist = {
  name: string;
  coverArt: string | null;
  albums: Album[];
};

export type Playlist = {
    id: string;
    name: string;
    songIds: string[];
    createdAt: string;
}

export type AppData = {
    playlists: Playlist[];
    // We can add other settings here in the future
}
