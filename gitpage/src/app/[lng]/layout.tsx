import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';
import { LocaleTypes } from '@/config';
import './global.css';
import ThemeProvider from './_components/ThemeProvider';
import Header from './_components/Header';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'retikz doc',
  description: 'atomic drawing library implemented using react and d3, inspired by tikz',
};

export type RootLayoutProps = {
  params: Promise<{ lng: LocaleTypes }>;
} & PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = async props => {
  const { children, params } = props;
  const { lng } = await params;

  return (
    <html lang={lng}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased w-full h-full`}>
        <ThemeProvider>
          <Header />
          <Toaster />
          <div className="flex flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
