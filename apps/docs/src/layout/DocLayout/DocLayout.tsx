import type { FC } from 'react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { toast } from 'sonner';

import { useTocStore } from '@/store/useTocStore';

import AppHeader from './header/AppHeader';
import { AppSidebar } from './sidebar/AppSidebar';

/**
 * 文档站主布局：顶栏 sticky + 主区 flex（侧栏 + Outlet）。
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
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
