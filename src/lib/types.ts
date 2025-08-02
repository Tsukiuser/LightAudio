export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverArt: string | null;
  url: string;
  fileHandle?: FileSystemFileHandle;
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
