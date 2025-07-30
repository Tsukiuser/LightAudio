import AudioPlayer from '@/components/AudioPlayer';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <main className="flex-1 pb-36">{children}</main>
      <AudioPlayer />
      <BottomNav />
    </div>
  );
}
