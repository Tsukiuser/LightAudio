
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import FileAccessManager from '@/components/FileAccessManager';
import ThemeManager from '@/components/ThemeManager';
import { MusicProvider } from '@/context/MusicContext';
import { Inter } from 'next/font/google';

export const metadata: Metadata = {
  title: 'LightAudio',
  description: 'Your local music, reimagined.',
  manifest: '/manifest.json',
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`}>
        <ThemeManager />
        <MusicProvider>
          <FileAccessManager>
            {children}
          </FileAccessManager>
        </MusicProvider>
        <Toaster />
      </body>
    </html>
  );
}
