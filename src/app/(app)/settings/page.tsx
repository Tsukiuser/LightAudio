
'use client'

import { useContext } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';


export default function SettingsPage() {
    const musicContext = useContext(MusicContext);
    const { toast } = useToast();

    const handleChangeFolder = async () => {
        try {
            // @ts-ignore
            const dirHandle = await window.showDirectoryPicker();
            await musicContext?.loadMusic(dirHandle);
        } catch (error) {
           console.error('Error accessing directory:', error);
           if (error instanceof DOMException && error.name === 'AbortError') {
             // Silently ignore abort errors
           } else {
            toast({
                title: 'Error',
                description: 'Could not access the music folder.',
                variant: 'destructive'
            })
           }
        }
    }

  return (
    <div className="container mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-8 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Manage the folder where your music is stored.
            </Description>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleChangeFolder}>
              <FolderSync className="mr-2 h-4 w-4" />
              Change Music Folder
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
