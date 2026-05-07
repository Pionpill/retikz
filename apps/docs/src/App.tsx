import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { Toaster, toast } from 'sonner';

import { coreSection } from './data/core';
import { modules } from './data/module';
import AppHeader from './layout/header/AppHeader';
import { DocLayout } from './layout/DocLayout';
import { DocPage } from './pages/doc-page';
import { useTocStore } from './store/useTocStore';

/** 默认入口：首个模块下的第一个栏目的第一页 */
const defaultPath = `/${modules[0].id}/${coreSection[0].id}/${coreSection[0].pages[0].id}`;

/** /:moduleId 命中时重定向到该模块首栏首页；找不到模块就回首页 */
const ModuleRedirect = () => {
  const { moduleId } = useParams<'moduleId'>();
  if (!modules.some(m => m.id === moduleId)) return <Navigate to="/" replace />;
  return <Navigate to={`/${moduleId}/${coreSection[0].id}/${coreSection[0].pages[0].id}`} replace />;
};

/** /:moduleId/:sectionId 命中时重定向到该栏首页；找不到模块/栏目就回上一级 */
const SectionRedirect = () => {
  const { moduleId, sectionId } = useParams<'moduleId' | 'sectionId'>();
  if (!modules.some(m => m.id === moduleId)) return <Navigate to="/" replace />;
  const section = coreSection.find(s => s.id === sectionId);
  if (!section) return <Navigate to={`/${moduleId}`} replace />;
  return <Navigate to={`/${moduleId}/${section.id}/${section.pages[0].id}`} replace />;
};

/** 全局快捷键：Ctrl+L 复制当前 URL；Ctrl+Alt+B 切换 TOC 显隐 */
const useDocShortcuts = () => {
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
};

export const App = () => {
  useDocShortcuts();
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <Routes>
        <Route element={<DocLayout />}>
          <Route index element={<Navigate to={defaultPath} replace />} />
          <Route path=":moduleId/:sectionId/:pageId/:subPageId" element={<DocPage />} />
          <Route path=":moduleId/:sectionId/:pageId" element={<DocPage />} />
          <Route path=":moduleId/:sectionId" element={<SectionRedirect />} />
          <Route path=":moduleId" element={<ModuleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </div>
  );
};
