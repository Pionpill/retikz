import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { FC, PropsWithChildren } from 'react';
import { localeTypes } from '@/config';

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
  params: Promise<{ lng: localeTypes }>;
} & PropsWithChildren;

const RootLayout: FC<RootLayoutProps> = async props => {
  const { children, params } = props;
  const { lng } = await params;

  return (
    <html lang={lng}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
};

export default RootLayout;
