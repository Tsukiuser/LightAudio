import { getAlbums } from '@/lib/music-utils';
import { mockSongs } from '@/lib/mock-data';
import { AlbumCard } from '@/components/AlbumCard';
import { PageHeader } from '@/components/PageHeader';

export default function HomePage() {
  const albums = getAlbums(mockSongs);
  const recentlyAddedAlbums = [...albums].reverse();

  return (
    <div className="container mx-auto max-w-7xl px-0">
      <PageHeader title="Home" />
      
      <section className="px-4 md:px-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Recently Added</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {recentlyAddedAlbums.map((album) => (
            <AlbumCard key={album.name} album={album} />
          ))}
        </div>
      </section>

       <section className="px-4 md:px-6 mt-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">All Albums</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {albums.map((album) => (
            <AlbumCard key={album.name} album={album} />
          ))}
        </div>
      </section>
    </div>
  );
}
