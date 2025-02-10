'use client';

import useThemeStore, { useThemeInitializer } from '@/hooks/store/useThemeStore';
import { FC, PropsWithChildren } from 'react';

const ThemeProvider: FC<PropsWithChildren> = props => {
  const { children } = props;
  const theme = useThemeStore(state => state.theme);

  useThemeInitializer();

  return <div className={`flex flex-col w-screen h-screen ${theme === 'light' ? 'light' : 'dark'}`}>{children}</div>;
};

export default ThemeProvider;
