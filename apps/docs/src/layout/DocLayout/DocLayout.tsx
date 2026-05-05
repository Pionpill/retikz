import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useTocStore } from '@/store/useTocStore';
import type { CSSProperties, FC } from 'react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { toast } from 'sonner';
import AppHeader from './AppHeader';
import { AppSidebar } from './AppSidebar';

const sidebarStyle = {
  '--sidebar-width': '16rem',
} as CSSProperties;

/**
 * 文档站主布局：左侧 Sidebar + 主内容 Outlet。
 * 顶部 sticky header 左侧 SidebarTrigger，右侧文档级动作（复制链接 / 切 TOC）。
 * 全局快捷键 Ctrl+L / Ctrl+Alt+B 同步挂在 layout 一级，覆盖所有页面。
 */
export const DocLayout: FC = () => {
  const { t } = useTranslation();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(t('toc.linkCopied'));
  }, [t]);

  const handleToggleToc = useCallback(() => {
    setTocOpen(!tocOpen);
  }, [tocOpen, setTocOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.ctrlKey && !event.altKey && !event.shiftKey && key === 'l') {
        event.preventDefault();
        handleCopyLink();
        return;
      }
      if (event.ctrlKey && event.altKey && !event.shiftKey && key === 'b') {
        event.preventDefault();
        handleToggleToc();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyLink, handleToggleToc]);

  return (
    <SidebarProvider style={sidebarStyle}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};
