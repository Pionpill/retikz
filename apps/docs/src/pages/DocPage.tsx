import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { coreSection } from '../data/core';

/** /:sectionId/:pageId 路由的渲染器：找不到则显示 404 文案 */
export const DocPage = () => {
  const { t } = useTranslation();
  const { sectionId, pageId } = useParams<'sectionId' | 'pageId'>();
  const section = coreSection.find(s => s.id === sectionId);
  const page = section?.pages.find(p => p.id === pageId);

  if (!section || !page) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
        <p className="text-sm">{t('common.notFound', { section: sectionId ?? '?', page: pageId ?? '?' })}</p>
      </main>
    );
  }

  const title = t(page.label);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {page.extra}
      </header>
      <div className="prose prose-slate max-w-none dark:prose-invert">
        {page.content ?? <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>}
      </div>
    </main>
  );
};
