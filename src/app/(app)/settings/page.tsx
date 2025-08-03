
'use client'

import { useContext, useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync, RefreshCw, Paintbrush, Undo, Trash2, Palette, Smartphone } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}


export default function SettingsPage() {
    const musicContext = useContext(MusicContext);
    const { toast } = useToast();
    const [backgroundColor, setBackgroundColor] = useState('#26262b');
    const [accentColor, setAccentColor] = useState('#9f8fbf');
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isPwaInstalled, setIsPwaInstalled] = useState(false);
    
    useEffect(() => {
        const savedBg = localStorage.getItem('theme-background-color');
        const savedAccent = localStorage.getItem('theme-accent-color');
        if (savedBg) setBackgroundColor(savedBg);
        if (savedAccent) setAccentColor(savedAccent);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const checkPwaInstalled = () => {
            if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
                setIsPwaInstalled(true);
            }
        };
        checkPwaInstalled();

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
    }


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
    
    const handleColorChange = () => {
        localStorage.setItem('theme-background-color', backgroundColor);
        localStorage.setItem('theme-accent-color', accentColor);
        window.dispatchEvent(new Event('theme-changed'));
        toast({
            title: 'Theme Updated',
            description: 'Your new colors have been applied.',
        });
    }

    const handleResetColors = () => {
        localStorage.removeItem('theme-background-color');
        localStorage.removeItem('theme-accent-color');
        setBackgroundColor('#26262b');
        setAccentColor('#9f8fbf');
        window.dispatchEvent(new Event('theme-changed'));
         toast({
            title: 'Colors Reset',
            description: 'The color theme has been reset to its default.',
        });
    }

    const handleResetTheme = () => {
        localStorage.setItem('theme', 'dark');
        window.dispatchEvent(new Event('theme-changed'));
        // We might need to force a re-render of the toggle if it doesn't listen to storage
        window.location.reload(); 
    }

    const handleClearLibrary = () => {
        musicContext?.clearLibrary();
        toast({
            title: 'Library Cleared',
            description: 'Your music library has been cleared. Please grant folder access again.',
        });
    }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-3xl pb-28">
        <PageHeader title="Settings" />
        <div className="space-y-8 p-4 md:p-6">
          {!isPwaInstalled && (
            <Card>
              <CardHeader>
                <CardTitle>Install App</CardTitle>
                <CardDescription>
                  For a better experience, install the application on your device. 
                  If the button is disabled, try interacting with the app for a moment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstallClick} disabled={!installPrompt}>
                  <Smartphone className="mr-2 h-4 w-4" /> Install LightAudio
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={handleResetTheme}>
                <Undo className="mr-2 h-4 w-4" /> Reset Theme
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Color Customization</CardTitle>
                <CardDescription>
                    Personalize the app's colors. This only applies to the dark theme.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Label htmlFor="background-color" className="flex items-center gap-2"><Palette className="h-4 w-4"/>Background</Label>
                    <Input 
                        id="background-color" 
                        type="color" 
                        value={backgroundColor} 
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 p-1"
                    />
                </div>
                 <div className="flex items-center gap-4">
                    <Label htmlFor="accent-color" className="flex items-center gap-2"><Palette className="h-4 w-4"/>Accent</Label>
                    <Input 
                        id="accent-color" 
                        type="color" 
                        value={accentColor} 
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-16 p-1"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleColorChange}>
                        <Paintbrush className="mr-2 h-4 w-4" />
                        Apply Colors
                    </Button>
                    <Button variant="outline" onClick={handleResetColors}>
                        <Undo className="mr-2 h-4 w-4" />
                        Reset Colors
                    </Button>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
              <CardDescription>
                Manage the folder where your music is stored and scan for new content.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleChangeFolder}>
                <FolderSync className="mr-2 h-4 w-4" />
                Change Music Folder
              </Button>
               <Button variant="outline" onClick={handleRescanFolder} disabled={!musicContext?.hasAccess}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan Folder
              </Button>
              <Button variant="destructive" onClick={handleClearLibrary} disabled={!musicContext?.hasAccess}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Library
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Version 1.9.5</p>
                <p className="text-sm text-muted-foreground mt-1">Made by Victor Martinez on Firebase Studio</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}
