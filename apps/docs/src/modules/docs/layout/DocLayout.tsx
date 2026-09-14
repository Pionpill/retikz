import type { FC } from 'react';
import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

import { cn } from '@/lib';
import { useLayoutStore } from '@/store';

import { AppSidebar } from './sidebar/AppSidebar';

/**
 * Header 下方的文档主体：左 Sidebar + 中 Outlet（含右 TOC）
 * @description layout=default 宽度不限三栏拉开，layout=centered 走 max-w-[1440px] + mx-auto 居中；左侧 Sidebar 与右侧 TOC 均可独立隐藏
 */
export const DocLayout: FC = () => {
  const layout = useLayoutStore(s => s.layout);
  const sidebarOpen = useLayoutStore(s => s.sidebarOpen);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className={cn('flex flex-1', layout === 'centered' && 'mx-auto w-full max-w-[1440px]')}>
      <div
        aria-hidden={!sidebarOpen}
        className={cn(
          'hidden shrink-0 overflow-clip transition-all duration-300 ease-out lg:block',
          sidebarOpen ? 'w-55 opacity-100' : 'w-0 opacity-0',
        )}
      >
        <AppSidebar />
      </div>
      <main className="flex min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
};
