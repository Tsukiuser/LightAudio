
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Settings, Plus, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { useContext } from 'react';
import { MusicContext } from '@/context/MusicContext';
import { StaticLogo } from './StaticLogo';
import { Sidebar, useSidebar } from './ui/sidebar';
import CreatePlaylistDialog from './CreatePlaylistDialog';


const mainNavItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const musicContext = useContext(MusicContext);

  return (
    <Sidebar>
        <div className={cn("p-4 flex items-center justify-between", state === 'collapsed' && 'justify-center')}>
            <Link href="/" className={cn("flex items-center gap-2", state === 'collapsed' && 'hidden')}>
                <StaticLogo className="h-7 w-7" />
                <h1 className="text-xl font-bold">LightAudio</h1>
            </Link>
             <Link href="/" className={cn("items-center gap-2", state === 'expanded' && 'hidden')}>
                <StaticLogo className="h-7 w-7" />
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
                     state === 'collapsed' && 'justify-center',
                    isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                >
                <item.icon className="h-5 w-5" />
                <span className={cn(state === 'collapsed' && 'hidden')}>
                    {item.label}
                </span>
                </Link>
            );
            })}
        </nav>

        <Separator className="my-2" />

        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
            <div className={cn("flex justify-between items-center px-2", state === 'collapsed' && 'hidden')}>
                <h2 className="text-sm font-semibold text-muted-foreground">Playlists</h2>
                <CreatePlaylistDialog>
                    <button className="text-muted-foreground hover:text-foreground">
                        <Plus className="h-5 w-5"/>
                    </button>
                </CreatePlaylistDialog>
            </div>
             {musicContext?.playlists.map((playlist) => {
                 const isActive = pathname === `/playlist/${playlist.id}`;
                 return (
                    <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                         className={cn(
                            'flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors',
                            state === 'collapsed' && 'justify-center',
                            isActive
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                    >
                        <ListMusic className="h-5 w-5" />
                        <span className={cn("truncate", state === 'collapsed' && 'hidden')}>
                            {playlist.name}
                        </span>
                    </Link>
                 )
             })}
        </div>
        
        <Separator />

        <div className="p-2">
            <Link
                href="/settings"
                className={cn(
                    'flex items-center gap-3 rounded-md p-2 text-sm font-medium transition-colors',
                    state === 'collapsed' && 'justify-center',
                    pathname === '/settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
                >
                <Settings className="h-5 w-5" />
                <span className={cn(state === 'collapsed' && 'hidden')}>
                    Settings
                </span>
            </Link>
        </div>
    </Sidebar>
  );
}
