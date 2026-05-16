import type { FC } from 'react';
import { Outlet } from 'react-router';

import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/useLayoutStore';

import { AppSidebar } from './sidebar/AppSidebar';

/**
 * Header 下方的文档主体：左 Sidebar + 中 Outlet（含右 TOC）
 * @description layout=default 宽度不限三栏拉开，layout=centered 走 max-w-[1440px] + mx-auto 居中；Sidebar / TOC 两种模式都保留，隐藏靠各自 toggle
 */
export const DocLayout: FC = () => {
  const layout = useLayoutStore(s => s.layout);
  return (
    <div className={cn('flex flex-1', layout === 'centered' && 'mx-auto w-full max-w-[1440px]')}>
      <AppSidebar />
      <main className="flex min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
};
