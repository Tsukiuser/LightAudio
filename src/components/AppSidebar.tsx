
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { useContext } from 'react';
import { MusicContext } from '@/context/MusicContext';
import { MusicVisualizer } from './MusicVisualizer';

const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function AppSidebar() {
  const pathname = usePathname();
  const musicContext = useContext(MusicContext);

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-card text-card-foreground border-r flex flex-col z-30">
        <div className="p-4">
            <Link href="/" className="flex items-center gap-2">
                <MusicVisualizer audioRef={musicContext?.audioRef} isPlaying={musicContext?.isPlaying ?? false}/>
                <h1 className="text-xl font-bold">LightAudio</h1>
            </Link>
        </div>
        <nav className="flex flex-col p-2">
            {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    'flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors',
                    isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
                </Link>
            );
            })}
        </nav>

        <Separator className="my-2" />

        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-sm font-semibold text-muted-foreground">Playlists</h2>
                <button className="text-muted-foreground hover:text-foreground">
                    <Plus className="h-5 w-5"/>
                </button>
            </div>
             {/* Playlist items will go here */}
        </div>
        
        <Separator />

        <div className="p-2">
            <Link
                href="/settings"
                className={cn(
                    'flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors',
                    pathname === '/settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
            </Link>
        </div>
    </div>
  );
}
