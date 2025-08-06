
'use client'

import { useContext, useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync, RefreshCw, Paintbrush, Undo, Trash2, Palette, Smartphone, Download, Upload, LifeBuoy } from 'lucide-react';
import { MusicContext } from '@/context/MusicContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
            toast({
                title: 'Folder Changed',
                description: 'Your music library is being updated in the background.',
            });
            await musicContext?.loadMusic(dirHandle);
        } catch (error) {
           console.error('Error accessing directory:', error);
           if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotAllowedError')) {
             // Silently ignore abort errors or security errors from programatic triggers
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
        window.location.reload(); 
    }

    const handleClearLibrary = () => {
        musicContext?.clearLibrary();
        toast({
            title: 'Library Cleared',
            description: 'Your music library has been cleared. Please grant folder access again.',
        });
    }

    const handleExport = () => {
        musicContext?.exportData();
        toast({
            title: 'Data Exported',
            description: 'Your playlists and settings have been saved to a file.',
        });
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            musicContext?.importData(file);
        }
    };


  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto max-w-3xl pb-28">
        <PageHeader title="Settings" />
        <div className="space-y-8 p-4 md:p-6">
          
          <Card>
              <CardHeader>
                <CardTitle>Install App</CardTitle>
                <CardDescription>
                  For a better experience, install the application on your device. 
                  If the button is disabled, the app is likely already installed or your browser needs a moment to offer the installation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleInstallClick} disabled={!installPrompt || isPwaInstalled}>
                  <Smartphone className="mr-2 h-4 w-4" /> {isPwaInstalled ? 'App Installed' : 'Install LightAudio' }
                </Button>
              </CardContent>
            </Card>

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
                 {musicContext?.isScanning && <span className="text-primary animate-pulse ml-2">Scanning...</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleChangeFolder} disabled={musicContext?.isScanning}>
                <FolderSync className="mr-2 h-4 w-4" />
                Change Music Folder
              </Button>
               <Button variant="outline" onClick={handleRescanFolder} disabled={!musicContext?.hasAccess || musicContext?.isScanning}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rescan Folder
              </Button>
              <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" disabled={!musicContext?.hasAccess || musicContext?.isScanning}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear Library
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your
                            library and playlist data. You will need to grant folder access again.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearLibrary}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                  <CardDescription>
                      Backup or restore your playlists and application settings.
                  </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleExport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                  </Button>
                  <Button variant="outline" onClick={handleImportClick}>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                  </Button>
                   <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelected}
                        accept=".txt,.json"
                        className="hidden"
                    />
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Support</CardTitle>
                <CardDescription>
                    Need help or have a suggestion? Join our community on Discord.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <a href="https://discord.gg/hVvasyH2XV" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                        <LifeBuoy className="mr-2 h-4 w-4" />
                        Join Discord
                    </Button>
                </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Credits</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Version 2.3.0</p>
                <p className="text-sm text-muted-foreground mt-1">Made by Victor Martinez on Firebase Studio</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  );
}

    