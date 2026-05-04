import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { MdxContent } from '@/components/shared/MdxContent';
import { coreSection } from '@/data/core';
import { useMdxSource } from './useMdxSource';

/**
 * /:moduleId/:sectionId/:pageId(/:subPageId)? 路由的渲染器。
 * - 找不到对应数据节点 → 404 文案
 * - 命中分组节点（含 children）→ 重定向到首个子项，避免空页面
 * - 命中叶子节点 → 加载并渲染对应路径下的 mdx 文件
 */
export const DocPage: FC = () => {
  const { t } = useTranslation();
  const { moduleId, sectionId, pageId, subPageId } = useParams<
    'moduleId' | 'sectionId' | 'pageId' | 'subPageId'
  >();

  const section = coreSection.find(s => s.id === sectionId);
  const page = section?.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.children?.find(c => c.id === subPageId) : undefined;

  /** 当前 URL 实际指向的节点：4 段时是 subPage，3 段时是 page */
  const target = subPageId ? subPage : page;

  const { source, notFound } = useMdxSource();

  if (!section || !target) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
        <p className="text-sm">
          {t('common.notFound', { section: sectionId ?? '?', page: subPageId ?? pageId ?? '?' })}
        </p>
      </main>
    );
  }

  // 命中分组节点：跳到首个子项（用户直接访问 group URL 时兜底）
  if (target.children) {
    const firstChild = target.children[0];
    const basePath = subPageId
      ? `/${moduleId}/${sectionId}/${pageId}/${subPageId}`
      : `/${moduleId}/${sectionId}/${pageId}`;
    return <Navigate to={`${basePath}/${firstChild.id}`} replace />;
  }

  const title = t(target.label);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {target.extra}
      </header>
      <div className="prose prose-slate max-w-none dark:prose-invert">
        {source != null ? (
          <MdxContent source={source} />
        ) : notFound ? (
          <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
        ) : null}
      </div>
    </main>
  );
};
