
'use client';

import { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MusicContext } from '@/context/MusicContext';
import type { Playlist } from '@/lib/types';

export function RenamePlaylistDialog({ children, playlist }: { children: React.ReactNode, playlist: Playlist }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(playlist.name);
  const musicContext = useContext(MusicContext);

  const handleRename = async () => {
    if (name.trim() && name.trim() !== playlist.name) {
      await musicContext?.renamePlaylist(playlist.id, name.trim());
    }
    setOpen(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
        setName(playlist.name);
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Playlist</DialogTitle>
          <DialogDescription>
            Enter a new name for the playlist &quot;{playlist.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleRename} disabled={!name.trim() || name.trim() === playlist.name}>Rename</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
