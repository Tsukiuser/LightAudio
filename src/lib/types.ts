export type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverArt: string;
  url: string;
  fileHandle?: FileSystemFileHandle;
};

export type Album = {
  name: string;
  artist: string;
  coverArt: string;
  songs: Song[];
};

export type Artist = {
  name: string;
  coverArt: string;
  albums: Album[];
};
