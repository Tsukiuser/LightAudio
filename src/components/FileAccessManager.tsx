
'use client';

import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';

export default function FileAccessManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const musicContext = useContext(MusicContext);
  const { toast } = useToast();

  const grantAccess = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      await musicContext?.loadMusic(dirHandle);
    } catch (error) {
       console.error('Error accessing directory:', error);
       if (error instanceof DOMException && error.name === 'AbortError') {
        toast({
            title: 'Permission Denied',
            description: 'You did not grant permission to access the music folder.',
            variant: 'destructive'
        })
       } else {
        toast({
            title: 'Error',
            description: 'Could not access the music folder.',
            variant: 'destructive'
        })
       }
    }
  };
  
  if (musicContext?.isLoading) {
    return (
       <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex flex-col items-center animate-in fade-in-50 duration-1000">
          <Music className="h-16 w-16 text-primary mb-6 animate-pulse" />
          <h1 className="text-3xl font-bold text-foreground mb-2 font-headline">
            Scanning Library
          </h1>
          <p className="text-muted-foreground max-w-md mb-8">
            Please wait while we scan your music collection...
          </p>
        </div>
      </div>
    )
  }

  if (!musicContext?.hasAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex flex-col items-center animate-in fade-in-50 duration-1000">
          <Music className="h-16 w-16 text-primary mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2 font-headline">
            Welcome to LightAudio
          </h1>
          <p className="text-muted-foreground max-w-md mb-8">
            To get started, please grant the application access to your music
            folder. We'll scan it to build your local music library.
          </p>
          <Button size="lg" onClick={grantAccess}>
            Grant Folder Access
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
