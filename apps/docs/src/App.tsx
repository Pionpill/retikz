import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { Toaster, toast } from 'sonner';

import type { Section } from './data/interface';
import { coreSection } from './data/core';
import { modules } from './data/module';
import { getSectionsByModule } from './data/sections';
import AppHeader from './layout/header/AppHeader';
import { DocLayout } from './layout/DocLayout';
import { DocPage } from './pages/doc-page';
import { useTocStore } from './store/useTocStore';

/** section + 它的首页 → 完整 URL（无分组时跳过 sectionId 段） */
const firstPageUrl = (moduleId: string, section: Section): string => {
  const firstPage = section.pages[0];
  return section.label && section.id
    ? `/${moduleId}/${section.id}/${firstPage.id}`
    : `/${moduleId}/${firstPage.id}`;
};

/** 默认入口：首个模块下的第一个栏目的第一页 */
const defaultPath = firstPageUrl(modules[0].id, coreSection[0]);

/** /:moduleId 命中时重定向到该模块首栏首页；找不到模块或模块为空就回首页 */
const ModuleRedirect = () => {
  const { moduleId } = useParams<'moduleId'>();
  if (!moduleId || !modules.some(m => m.id === moduleId)) return <Navigate to="/" replace />;
  const sections = getSectionsByModule(moduleId);
  if (sections.length === 0 || sections[0].pages.length === 0) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={firstPageUrl(moduleId, sections[0])} replace />;
};

/**
 * 2-段 URL 解析器：`/:moduleId/:firstSeg`
 * - firstSeg 是 ungrouped section 下的某 page id → 直接渲染 DocPage
 * - firstSeg 是 grouped section 的 id → 重定向到该 section 首页
 * - 其它 → 回模块根
 */
const TwoSegResolver = () => {
  const { moduleId, firstSeg } = useParams<'moduleId' | 'firstSeg'>();
  if (!moduleId || !firstSeg || !modules.some(m => m.id === moduleId)) {
    return <Navigate to="/" replace />;
  }
  const sections = getSectionsByModule(moduleId);

  const ungrouped = sections.find(s => !s.label);
  if (ungrouped?.pages.some(p => p.id === firstSeg)) {
    return <DocPage />;
  }

  const grouped = sections.find(s => s.label && s.id === firstSeg);
  if (grouped) return <Navigate to={firstPageUrl(moduleId, grouped)} replace />;

  return <Navigate to={`/${moduleId}`} replace />;
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
          <Route path=":moduleId/:firstSeg" element={<TwoSegResolver />} />
          <Route path=":moduleId" element={<ModuleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </div>
  );
};
