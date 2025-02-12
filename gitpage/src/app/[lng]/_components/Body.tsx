'use client';
import useTheme from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { FC, ReactNode, useEffect, useLayoutEffect } from 'react';

export type BodyProps = {
  className: string;
  cookieTheme?: 'light' | 'dark';
  children: ReactNode;
};

const Body: FC<BodyProps> = props => {
  const { className, cookieTheme, children } = props;
  const { theme, switchTheme } = useTheme();

  useLayoutEffect(() => switchTheme(cookieTheme || theme), []);

  return <body className={cn(className, theme)}>{children}</body>;
};

export default Body;
