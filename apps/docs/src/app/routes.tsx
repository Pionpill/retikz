import { Navigate, Route, Routes, useParams } from 'react-router';

import type { Section } from '@/modules/docs/data';

import { getSectionsByModule, kernelSection, modules } from '@/modules/docs/data';
import { DocLayout, DocPage } from '@/modules/docs/layout';

import { AppLayout } from './AppLayout';

/** section + 它的首页 -> 完整 URL（无分组时跳过 sectionId 段） */
const firstPageUrl = (moduleId: string, section: Section): string => {
  if (section.document && section.id) return `/${moduleId}/${section.id}`;
  const firstPage = section.pages[0];
  return section.label && section.id ? `/${moduleId}/${section.id}/${firstPage.id}` : `/${moduleId}/${firstPage.id}`;
};

/** 默认入口：首个模块下的第一个栏目的第一页 */
const defaultPath = firstPageUrl(modules[0].id, kernelSection[0]);

/** /:moduleId 命中时重定向到该模块首栏首页；找不到模块或模块为空就回首页 */
const ModuleRedirect = () => {
  const { moduleId } = useParams<'moduleId'>();
  if (!moduleId || !modules.some(m => m.id === moduleId)) return <Navigate to="/" replace />;
  const sections = getSectionsByModule(moduleId);
  if (sections.length === 0) return <Navigate to="/" replace />;
  const firstSection = sections[0];
  if (!firstSection.document && firstSection.pages.length === 0) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={firstPageUrl(moduleId, firstSection)} replace />;
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
  if (grouped) {
    if (grouped.document) return <DocPage />;
    return <Navigate to={firstPageUrl(moduleId, grouped)} replace />;
  }

  return <Navigate to={`/${moduleId}`} replace />;
};

export const AppRoutes = () => (
  <Routes>
    <Route element={<AppLayout />}>
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
);
