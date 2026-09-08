import type { FC } from 'react';

import { useEffect, useRef } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router';

import type { Section } from '@/modules/docs/data';

import { DOC_ABOUT_ID, getSectionsByArea, isDocModuleId } from '@/modules/docs/data';
import { DocLayout, DocPage } from '@/modules/docs/layout';
import { useDocModuleStore } from '@/modules/docs/store';

import { AppLayout } from './AppLayout';
import { DocsHome } from './home/DocsHome';
import { DocsModuleHome } from './module/DocsModuleHome';

/** section + 它的首页 -> 完整 URL（无分组时跳过 sectionId 段） */
const firstPageUrl = (moduleId: string, section: Section): string => {
  if (section.document && section.id) return `/${moduleId}/${section.id}`;
  const firstPage = section.pages[0];
  return section.label && section.id ? `/${moduleId}/${section.id}/${firstPage.id}` : `/${moduleId}/${firstPage.id}`;
};

/** 首页入口：按持久化 scope 显示首页，或进入最近使用的真实模块主页。 */
const HomeEntry: FC = () => {
  const scope = useDocModuleStore(state => state.scope);
  return scope === 'home' ? <DocsHome /> : <Navigate to={`/${scope}`} replace />;
};

/** 只在真实模块 URL 下同步最近阅读 scope。 */
const DocScopeSync: FC = () => {
  const { pathname } = useLocation();
  const scope = useDocModuleStore(state => state.scope);
  const selectScope = useDocModuleStore(state => state.selectScope);
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  const previousFirstSegment = useRef<string | undefined>(undefined);

  useEffect(() => {
    const segmentChanged = previousFirstSegment.current !== firstSegment;
    previousFirstSegment.current = firstSegment;
    if (!segmentChanged) return;
    if (firstSegment && isDocModuleId(firstSegment) && scope !== firstSegment) {
      selectScope(firstSegment);
    }
  }, [firstSegment, scope, selectScope]);

  return <Outlet />;
};

/** /:moduleId 命中时显示该模块的空白主页；未知模块回首页。 */
const ModuleHomeRoute: FC = () => {
  const { moduleId } = useParams<'moduleId'>();
  return moduleId && isDocModuleId(moduleId) ? <DocsModuleHome moduleId={moduleId} /> : <Navigate to="/" replace />;
};

/**
 * 2-段 URL 解析器 `/:moduleId/:firstSeg`
 * @description firstSeg 是 ungrouped page id 直接渲染 DocPage；是 grouped section id 重定向到该 section 首页；其它回模块根
 */
const TwoSegResolver = () => {
  const { moduleId, firstSeg } = useParams<'moduleId' | 'firstSeg'>();
  if (!moduleId || !firstSeg || !isDocModuleId(moduleId)) {
    return <Navigate to="/" replace />;
  }
  const sections = getSectionsByArea(moduleId);

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

/** About 的两段入口解析器，数据源固定为 home-owned About section。 */
const AboutTwoSegResolver: FC = () => {
  const { firstSeg } = useParams<'firstSeg'>();
  if (!firstSeg) return <Navigate to="/about/overview" replace />;

  const sections = getSectionsByArea(DOC_ABOUT_ID);
  const ungrouped = sections.find(section => !section.label);
  if (ungrouped?.pages.some(page => page.id === firstSeg)) return <DocPage />;

  const grouped = sections.find(section => section.label && section.id === firstSeg);
  if (grouped) {
    if (grouped.document) return <DocPage />;
    return <Navigate to={firstPageUrl(DOC_ABOUT_ID, grouped)} replace />;
  }

  return <Navigate to="/about" replace />;
};

export const AppRoutes: FC = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route element={<DocScopeSync />}>
        <Route index element={<HomeEntry />} />
        <Route path="about">
          <Route index element={<Navigate to="/about/overview" replace />} />
          <Route path=":sectionId/:pageId/:subPageId" element={<DocLayout />}>
            <Route index element={<DocPage />} />
          </Route>
          <Route path=":sectionId/:pageId" element={<DocLayout />}>
            <Route index element={<DocPage />} />
          </Route>
          <Route path=":firstSeg" element={<DocLayout />}>
            <Route index element={<AboutTwoSegResolver />} />
          </Route>
        </Route>
        <Route path=":moduleId" element={<ModuleHomeRoute />} />
        <Route element={<DocLayout />}>
          <Route path=":moduleId/:sectionId/:pageId/:subPageId" element={<DocPage />} />
          <Route path=":moduleId/:sectionId/:pageId" element={<DocPage />} />
          <Route path=":moduleId/:firstSeg" element={<TwoSegResolver />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Route>
  </Routes>
);
