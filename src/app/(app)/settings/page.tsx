
'use client'

import { useContext } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync, RefreshCw } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function SettingsPage() {
    const musicContext = useContext(MusicContext);
    const { toast } = useToast();

    const handleChangeFolder = async () => {
        try {
            // @ts-ignore
            const dirHandle = await window.showDirectoryPicker();
            await musicContext?.loadMusic(dirHandle);
            toast({
                title: 'Folder Changed',
                description: 'Your music library is being updated.',
            })
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

    const handleRescanFolder = async () => {
        toast({
            title: 'Rescanning Library',
            description: 'Please wait while we look for new music.',
        });
        await musicContext?.rescanMusic();
    }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-3xl pb-8">
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
                Manage the folder where your music is stored and scan for new content.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleChangeFolder}>
                <FolderSync className="mr-2 h-4 w-4" />
                Change Music Folder
              </Button>
               <Button variant="outline" onClick={handleRescanFolder} disabled={!musicContext?.hasAccess}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan Folder
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
