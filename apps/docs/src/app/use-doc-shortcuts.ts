import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useComponentPreviewStore } from '@/modules/docs/store/use-component-preview-store';
import { useTocStore } from '@/modules/docs/store/use-toc-store';
import { useLayoutStore } from '@/store/use-layout-store';

/**
 * 全局快捷键
 * @description Ctrl+L 复制 URL；Ctrl+Alt+B 切 TOC；Ctrl+Alt+M 切布局；Ctrl+Alt+H 切隐藏所有 demo 代码；Ctrl+Alt+E 切强制展开所有 demo 代码
 */
export const useDocShortcuts = () => {
  const { t } = useTranslation();
  const tocOpen = useTocStore(state => state.tocOpen);
  const setTocOpen = useTocStore(state => state.setTocOpen);
  const hasToc = useTocStore(state => state.hasToc);
  const toggleLayout = useLayoutStore(s => s.toggleLayout);
  const togglePreviewHideCode = useComponentPreviewStore(s => s.toggleHideCode);
  const togglePreviewIsExpand = useComponentPreviewStore(s => s.toggleIsExpand);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success(t('toc.linkCopied'));
  }, [t]);

  const handleToggleToc = useCallback(() => {
    if (!hasToc) return;
    setTocOpen(!tocOpen);
  }, [hasToc, tocOpen, setTocOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Mac 走 metaKey，其它平台走 Ctrl；与 UI 上 Shortcut 渲染的 mod 含义一致
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && !event.altKey && !event.shiftKey && key === 'l') {
        event.preventDefault();
        handleCopyLink();
        return;
      }
      if (mod && event.altKey && !event.shiftKey) {
        switch (key) {
          case 'b':
            event.preventDefault();
            handleToggleToc();
            return;
          case 'm':
            event.preventDefault();
            toggleLayout();
            return;
          case 'h':
            event.preventDefault();
            togglePreviewHideCode();
            return;
          case 'e':
            event.preventDefault();
            togglePreviewIsExpand();
            return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopyLink, handleToggleToc, toggleLayout, togglePreviewHideCode, togglePreviewIsExpand]);
};
