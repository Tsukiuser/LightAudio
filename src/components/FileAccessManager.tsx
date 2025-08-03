
'use client';

import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';
import { StaticLogo } from './StaticLogo';

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
        // Silently ignore abort errors, as the user cancelled the picker.
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
          <StaticLogo className="h-16 w-16 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2 font-headline">
            Loading Library
          </h1>
          <p className="text-muted-foreground max-w-md mb-8">
            Please wait while we load your music collection...
          </p>
        </div>
      </div>
    )
  }

  if (!musicContext?.hasAccess) {
    return (
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <button
            onClick={grantAccess}
            className="absolute top-0 left-0 h-16 w-16 opacity-0"
            aria-label="Grant folder access (hidden)"
        />
        <div className="flex flex-col items-center animate-in fade-in-50 duration-1000">
          <StaticLogo className="h-16 w-16 text-primary mb-6" />
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
