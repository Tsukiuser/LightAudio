
'use client'

import AudioPlayer from '@/components/AudioPlayer';
import BottomNav from '@/components/BottomNav';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useContext } from 'react';
import { MusicContext } from '@/context/MusicContext';

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const sidebar = useSidebar();
  const musicContext = useContext(MusicContext);

  return (
    <div 
      className="group/body relative flex min-h-screen flex-col bg-background"
      data-sidebar-state={isMobile ? 'mobile' : sidebar.state}
    >
      <AppSidebar />
      <main className={`flex-1 transition-[margin-left] duration-300 ease-in-out ${isMobile ? 'pb-36' : 'md:group-data-[sidebar-state=expanded]/body:ml-64 md:group-data-[sidebar-state=collapsed]/body:ml-12'}`}>
        {children}
      </main>
      {!musicContext?.isScanning && <AudioPlayer />}
      {isMobile && <BottomNav />}
    </div>
  );
}


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
