'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

export default function FileAccessManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const accessGranted = localStorage.getItem('localbeat_access_granted');
    if (accessGranted === 'true') {
      setHasAccess(true);
    }
  }, []);

  const grantAccess = () => {
    localStorage.setItem('localbeat_access_granted', 'true');
    setHasAccess(true);
  };
  
  if (!isClient) {
    return null;
  }

  if (!hasAccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <div className="flex flex-col items-center animate-in fade-in-50 duration-1000">
          <Music className="h-16 w-16 text-primary mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2 font-headline">
            Welcome to Local Beat
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
