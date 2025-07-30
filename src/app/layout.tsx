import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import FileAccessManager from '@/components/FileAccessManager';
import ThemeManager from '@/components/ThemeManager';

export const metadata: Metadata = {
  title: 'Local Beat',
  description: 'Your local music, reimagined.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-body antialiased">
        <ThemeManager />
        <FileAccessManager>
          {children}
        </FileAccessManager>
        <Toaster />
      </body>
    </html>
  );
}
