import { Toaster } from '@/components/ui/toaster';
import { LocaleTypes } from '@/config';
import { THEME_COOKIE_NAME } from '@/config/cookie';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { FC, PropsWithChildren } from 'react';
import Body from './_components/Body';
import './global.css';

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
  const cookieTheme = (await cookies()).get(THEME_COOKIE_NAME)?.value as 'light' | 'dark';

  return (
    <html lang={lng}>
      <Body
        cookieTheme={cookieTheme}
        className={`${geistSans.variable} ${geistMono.variable} antialiased w-full h-full`}
      >
        <Toaster />
        {children}
      </Body>
    </html>
  );
};

export default RootLayout;
