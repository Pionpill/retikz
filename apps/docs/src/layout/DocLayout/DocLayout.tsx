import type { CSSProperties, FC } from 'react';
import { Outlet } from 'react-router';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

const sidebarStyle = {
  '--sidebar-width': '16rem',
} as CSSProperties;

/**
 * 文档站主布局：单层 Sidebar（参考 fx-data-nines 的实现）+ 主内容 Outlet。
 * 顶部留一个最小的 SidebarTrigger 让用户可点击折叠/展开侧栏。
 */
export const DocLayout: FC = () => (
  <SidebarProvider style={sidebarStyle}>
    <AppSidebar />
    <SidebarInset>
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Outlet />
    </SidebarInset>
  </SidebarProvider>
);
