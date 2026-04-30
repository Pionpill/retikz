import { Navigate, Route, Routes, useParams } from 'react-router';
import { DocLayout } from './layout/DocLayout';
import { DocPage } from './pages/DocPage';
import { sections } from './data/sections';

/** 默认入口：第一个栏目的第一页 */
const defaultPath = `/${sections[0].id}/${sections[0].pages[0].id}`;

/** /:sectionId 命中时重定向到该栏目首页；找不到栏目就回首页 */
const SectionRedirect = () => {
  const { sectionId } = useParams<'sectionId'>();
  const section = sections.find(s => s.id === sectionId);
  if (!section) return <Navigate to="/" replace />;
  return <Navigate to={`/${section.id}/${section.pages[0].id}`} replace />;
};

export const App = () => (
  <Routes>
    <Route element={<DocLayout />}>
      <Route index element={<Navigate to={defaultPath} replace />} />
      <Route path=":sectionId/:pageId" element={<DocPage />} />
      <Route path=":sectionId" element={<SectionRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);
