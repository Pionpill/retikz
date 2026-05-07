import type { FC } from 'react';
import { Outlet } from 'react-router';

import { AppSidebar } from './sidebar/AppSidebar';

/**
 * Header 下方的文档主体：左侧 Sidebar + 中间 Outlet。
 * 顶栏（AppHeader / MobileNav）和全局快捷键由更外层的 App 负责挂载。
 */
export const DocLayout: FC = () => (
  <div className="flex flex-1">
    <AppSidebar />
    <main className="flex min-w-0 flex-1">
      <Outlet />
    </main>
  </div>
);
