
import Image from 'next/image';
import Link from 'next/link';
import type { Album } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { AlbumPlaceholder } from './AlbumPlaceholder';

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/album/${encodeURIComponent(album.artist)}/${encodeURIComponent(album.name)}`} className="group relative">
      <Card className="overflow-hidden transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
        <CardContent className="p-0">
            {album.coverArt ? (
                <Image
                    src={album.coverArt}
                    alt={`Cover art for ${album.name}`}
                    width={300}
                    height={300}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                    data-ai-hint="album cover"
                />
            ) : (
                <AlbumPlaceholder className="transition-transform group-hover:scale-105 rounded-lg"/>
            )}
        </CardContent>
      </Card>
      <div className="mt-2">
        <h3 className="font-semibold text-foreground truncate">{album.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
      </div>
    </Link>
  );
}
