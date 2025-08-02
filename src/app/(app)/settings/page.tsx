
'use client'

import { useContext } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync, Bot } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


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

    const handleAiPlaylistToggle = async (checked: boolean) => {
        if (musicContext) {
            musicContext.setAiPlaylistEnabled(checked);
            if (checked) {
                toast({
                    title: 'AI Playlist enabled',
                    description: 'Generating a playlist based on your listening habits...',
                })
            } else {
                 toast({
                    title: 'AI Playlist disabled',
                    description: 'Playback queue has been cleared.',
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
            <CardTitle>Playback</CardTitle>
            <CardDescription>
              Enhance your listening experience with AI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
                <Bot className="h-5 w-5" />
                <Label htmlFor="ai-playlist-switch" className="flex-1">AI-Generated Playlist</Label>
                <Switch 
                    id="ai-playlist-switch" 
                    checked={musicContext?.isAiPlaylistEnabled}
                    onCheckedChange={handleAiPlaylistToggle}
                    disabled={musicContext?.isGeneratingPlaylist}
                />
            </div>
             <p className="text-sm text-muted-foreground mt-3">
                Automatically create a playlist based on your recent listening history. Manually added songs will appear at the top of the queue.
            </p>
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
