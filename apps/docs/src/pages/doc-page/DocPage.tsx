import type { MdxFrontmatter } from '@/components/shared/mdx-content';
import { MdxContent, MdxToc } from '@/components/shared/mdx-content';
import { getSectionsByModule } from '@/data/sections';
import { cn } from '@/lib/utils';
import { useTocStore } from '@/store/useTocStore';
import type { FC, HTMLAttributes } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { DocPageActions } from './DocPageActions';
import { DocPageFooterNav } from './DocPageFooterNav';
import { useMdxSource } from './useMdxSource';

export type DocPageProps = HTMLAttributes<HTMLDivElement>;

/**
 * /:moduleId/:sectionId/:pageId(/:subPageId)? 路由的渲染器。
 * - 找不到对应数据节点 → 404 文案
 * - 命中分组节点（含 children）→ 重定向到首个子项，避免空页面
 * - 命中叶子节点 → 加载并渲染对应路径下的 mdx 文件
 *
 * 不闪策略：
 *  - useMdxSource 的 source 在路由切换瞬间会回 null（新 mdx 还在 fetch）
 *  - 我们用 stableSource 保持上一份非空 source 给下游（MdxContent / MdxToc / DocPageActions）
 *  - MdxContent 内部 state.Content 也只在新编译成功才替换，于是「旧 → 新」无空白过渡
 *  - frontmatter（描述文字等）同理不主动重置；新 mdx 编完后 onFrontmatter 直接覆盖
 */
export const DocPage: FC<DocPageProps> = props => {
  const { className, ...resProps } = props;

  const { t } = useTranslation();
  const { moduleId, sectionId, pageId, subPageId } = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId'>();

  const section = getSectionsByModule(moduleId).find(s => s.id === sectionId);
  const page = section?.pages.find(p => p.id === pageId);
  const subPage = subPageId ? page?.children?.find(c => c.id === subPageId) : undefined;

  /** 当前 URL 实际指向的节点：4 段时是 subPage，3 段时是 page */
  const target = subPageId ? subPage : page;

  const { source, notFound } = useMdxSource();
  const tocOpen = useTocStore(state => state.tocOpen);

  const [frontmatter, setFrontmatter] = useState<MdxFrontmatter>({});
  /** 始终保留上一次非 null 的 source；过渡态时下游继续看见旧内容直至新 mdx 编译就绪 */
  const [stableSource, setStableSource] = useState<string | null>(source);
  if (source != null && source !== stableSource) {
    setStableSource(source);
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
    <main className={cn('flex flex-1 w-full p-6', className)} {...resProps}>
      <div className="flex flex-1 justify-center">
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <header className="flex flex-col items-start w-full justify-between gap-2">
            <div className="flex w-full items-center justify-between">
              <h1 className="scroll-m-24 text-3xl font-semibold tracking-tight sm:text-3xl overflow-hidden">{title}</h1>
              <div className="flex items-center gap-2">
                {stableSource != null && <DocPageActions source={stableSource} />}
                {target.extra}
              </div>
            </div>
            {description && <p className="text-muted-foreground">{description}</p>}
          </header>
          <div>
            {notFound ? (
              <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
            ) : (
              <MdxContent source={stableSource} onFrontmatter={setFrontmatter} />
            )}
          </div>
          <DocPageFooterNav />
        </div>
      </div>
      <aside
        aria-hidden={!tocOpen}
        className={cn(
          'hidden shrink-0 overflow-clip transition-all duration-300 ease-out xl:block px-4',
          tocOpen ? 'w-75 opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div
          className={cn(
            'sticky top-20 transition-all duration-300 ease-out',
            tocOpen ? 'translate-x-0' : 'pointer-events-none translate-x-2',
          )}
        >
          {stableSource != null && <MdxToc source={stableSource} />}
        </div>
      </aside>
    </main>
  );
};
