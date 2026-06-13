import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { Toaster, toast } from 'sonner';

import { AppErrorBoundary } from './components/shared/error-boundary';
import type { Section } from './data/interface';
import { coreSection } from './data/core';
import { modules } from './data/module';
import { getSectionsByModule } from './data/sections';
import { DocLayout, DocPage } from './layout/doc-layout';
import { ViewLayout } from './layout/view-layout';
import { useComponentPreviewStore } from './store/useComponentPreviewStore';
import { useLayoutStore } from './store/useLayoutStore';
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
 * 2-段 URL 解析器 `/:moduleId/:firstSeg`
 * @description firstSeg 是 ungrouped page id 直接渲染 DocPage；是 grouped section id 重定向到该 section 首页；其它回模块根
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

/**
 * 全局快捷键
 * @description Ctrl+L 复制 URL；Ctrl+Alt+B 切 TOC；Ctrl+Alt+M 切布局；Ctrl+Alt+H 切隐藏所有 demo 代码；Ctrl+Alt+E 切强制展开所有 demo 代码
 */
const useDocShortcuts = () => {
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
      // Mac 走 ⌘（metaKey），其它平台走 Ctrl —— 与 UI 上 Shortcut 渲染的 mod 含义一致
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

export const App = () => {
  useDocShortcuts();
  return (
    <AppErrorBoundary>
      <Routes>
        <Route element={<ViewLayout />}>
          <Route element={<DocLayout />}>
            <Route index element={<Navigate to={defaultPath} replace />} />
            <Route path=":moduleId/:sectionId/:pageId/:subPageId" element={<DocPage />} />
            <Route path=":moduleId/:sectionId/:pageId" element={<DocPage />} />
            <Route path=":moduleId/:firstSeg" element={<TwoSegResolver />} />
            <Route path=":moduleId" element={<ModuleRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
      <Toaster position="top-center" />
    </AppErrorBoundary>
  );
};
