
'use client';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlbumPlaceholder } from "./AlbumPlaceholder";
import Image from "next/image";
import type { Song } from "@/lib/types";
import { Info, Music, User, Album as AlbumIcon, Clock } from "lucide-react";

export function SongDetailsDialog({ song, children }: { song: Song, children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Song Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="mx-auto w-48 h-48">
              {song.coverArt ? (
                <Image
                  src={song.coverArt}
                  alt={`Cover for ${song.album}`}
                  width={200}
                  height={200}
                  className="aspect-square rounded-lg object-cover"
                  data-ai-hint="album cover"
                />
              ) : (
                <AlbumPlaceholder className="rounded-lg h-full w-full"/>
              )}
            </div>
            <div className="space-y-2 text-sm">
                <div className="flex items-start">
                    <Music className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Title</p>
                        <p className="text-muted-foreground">{song.title}</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <User className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Artist</p>
                        <p className="text-muted-foreground">{song.artist}</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <AlbumIcon className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Album</p>
                        <p className="text-muted-foreground">{song.album}</p>
                    </div>
                </div>
                 <div className="flex items-start">
                    <Clock className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">Duration</p>
                        <p className="text-muted-foreground">{song.duration}</p>
                    </div>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
