import type { FC } from 'react';
import { Outlet } from 'react-router';

import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/store/useLayoutStore';

import { AppSidebar } from './sidebar/AppSidebar';

/**
 * Header 下方的文档主体：左侧 Sidebar + 中间 Outlet（含右侧 TOC，由 DocPage 内部托管）。
 * 顶栏（AppHeader / MobileNav）和全局快捷键由更外层的 App 负责挂载。
 *
 * layout 切换只改变外层最大宽度：
 * - default：宽度不限，Sidebar 贴左、TOC 贴右、超宽屏会两侧拉得很开
 * - centered：max-w-[1440px] + mx-auto，整组三栏居中显示，超宽屏两侧各自留白
 *
 * Sidebar / TOC 在两种模式下都保留可见可点；隐藏行为由各自的 toggle（toc 按钮等）控制。
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
