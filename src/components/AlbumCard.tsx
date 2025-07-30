import Image from 'next/image';
import type { Album } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <div className="group relative cursor-pointer">
      <Card className="overflow-hidden transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
        <CardContent className="p-0">
          <Image
            src={album.coverArt}
            alt={`Cover art for ${album.name}`}
            width={300}
            height={300}
            className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
            data-ai-hint="album cover"
          />
        </CardContent>
      </Card>
      <div className="mt-2">
        <h3 className="font-semibold text-foreground truncate">{album.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{album.artist}</p>
      </div>
    </div>
  );
}
