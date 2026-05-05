import type { MdxFrontmatter } from '@/components/shared/MdxContent';
import { MdxContent, MdxToc } from '@/components/shared/MdxContent';
import { coreSection } from '@/data/core';
import { cn } from '@/lib/utils';
import { useTocStore } from '@/store/useTocStore';
import type { FC, HTMLAttributes } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { useMdxSource } from './useMdxSource';

export type DocPageProps = HTMLAttributes<HTMLDivElement>;

/**
 * /:moduleId/:sectionId/:pageId(/:subPageId)? 路由的渲染器。
 * - 找不到对应数据节点 → 404 文案
 * - 命中分组节点（含 children）→ 重定向到首个子项，避免空页面
 * - 命中叶子节点 → 加载并渲染对应路径下的 mdx 文件
 */
export const DocPage: FC<DocPageProps> = props => {
  const { className, ...resProps } = props;

  const { t } = useTranslation();
  const { moduleId, sectionId, pageId, subPageId } = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId'>();

  const section = coreSection.find(s => s.id === sectionId);
  const page = section?.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.children?.find(c => c.id === subPageId) : undefined;

  /** 当前 URL 实际指向的节点：4 段时是 subPage，3 段时是 page */
  const target = subPageId ? subPage : page;

  const { source, notFound } = useMdxSource();
  const tocOpen = useTocStore(state => state.tocOpen);

  const [frontmatter, setFrontmatter] = useState<MdxFrontmatter>({});
  const [prevSource, setPrevSource] = useState(source);
  if (source !== prevSource) {
    setPrevSource(source);
    setFrontmatter({});
  }

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
  const description = typeof frontmatter.description === 'string' ? frontmatter.description : null;

  return (
    <main className={cn('flex flex-1 min-w-0 gap-10 p-6', className)} {...resProps}>
      <div className="flex min-w-0 max-w-160 flex-1 flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {target.extra}
        </header>
        <div>
          {source != null ? (
            <MdxContent source={source} onFrontmatter={setFrontmatter} />
          ) : notFound ? (
            <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
          ) : null}
        </div>
      </div>
      {source != null && (
        <aside
          aria-hidden={!tocOpen}
          className={cn(
            'hidden shrink-0 overflow-hidden transition-all duration-300 ease-out xl:block',
            tocOpen ? 'w-56 opacity-100' : 'w-0 opacity-0',
          )}
        >
          <div
            className={cn(
              'sticky top-16 transition-all duration-300 ease-out',
              tocOpen ? 'translate-x-0' : 'pointer-events-none translate-x-2',
            )}
          >
            <MdxToc source={source} />
          </div>
        </aside>
      )}
    </main>
  );
};
