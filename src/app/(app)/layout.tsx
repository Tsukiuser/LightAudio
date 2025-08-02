
'use client'

import AudioPlayer from '@/components/AudioPlayer';
import BottomNav from '@/components/BottomNav';
import { AppSidebar } from '@/components/AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen flex-col bg-background">
        {!isMobile && <AppSidebar />}
        <main className={`flex-1 ${!isMobile ? 'ml-64' : 'pb-36'}`}>
          {children}
        </main>
        <AudioPlayer />
        {isMobile && <BottomNav />}
      </div>
    </SidebarProvider>
  );
}
