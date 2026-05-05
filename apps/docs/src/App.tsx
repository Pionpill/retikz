import { Navigate, Route, Routes, useParams } from 'react-router';
import { Toaster } from 'sonner';
import { coreSection } from './data/core';
import { modules } from './data/module';
import { DocLayout } from './layout/DocLayout';
import { DocPage } from './pages/doc-page';

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

export const App = () => (
  <>
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
  </>
);
