import { BlogFrontmatter } from '@/components/shared/blog-frontmatter';
import type { MdxFrontmatter } from '@/components/shared/mdx-content';
import { ChangelogFilter, ChangelogView, changelogToMarkdown } from '@/components/shared/changelog';
import { InlineMdx, MdxContent, MdxToc } from '@/components/shared/mdx-content';
import { changelog, changelogPageDescription } from '@/data/changelog';
import { getSectionsByModule } from '@/data/sections';
import { buildDocPageLinks } from '@/lib/docLinks';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { useTocStore } from '@/store/useTocStore';
import type { FC, HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { docPathSegments, isChangelogLocation, useDocLocation } from './docLocation';
import { DocPageActions } from './DocPageActions';
import { DocPageFooterNav } from './DocPageFooterNav';
import { useMdxSource } from './useMdxSource';

export type DocPageProps = HTMLAttributes<HTMLDivElement>;

/**
 * 文档页渲染器
 * @description 用 stableSource 保留上一次非空 source，路由切换时下游继续看见旧内容直至新 mdx 编译就绪，避免空白闪烁
 */
export const DocPage: FC<DocPageProps> = props => {
  const { className, ...resProps } = props;

  const { t, i18n } = useTranslation();
  const loc = useDocLocation();

  const sections = loc ? getSectionsByModule(loc.moduleId) : [];
  const section = loc
    ? loc.sectionId
      ? sections.find(s => s.id === loc.sectionId)
      : sections.find(s => !s.label)
    : undefined;
  const page = section?.pages.find(p => p.id === loc?.pageId);
  const subPage = loc?.subPageId ? page?.children?.find(c => c.id === loc.subPageId) : undefined;

  /** 当前 URL 实际指向的节点：4 段时是 subPage，否则是 page */
  const target = loc?.subPageId ? subPage : page;

  const { source, segments: sourceSegments, notFound, resolvedLang } = useMdxSource();
  const tocOpen = useTocStore(state => state.tocOpen);

  /** changelog 页走数据驱动渲染,不走 mdx 管线 */
  const isChangelog = isChangelogLocation(loc);

  const [frontmatter, setFrontmatter] = useState<MdxFrontmatter>({});
  /** 始终保留上一次非 null 的 source；过渡态时下游继续看见旧内容直至新 mdx 编译就绪 */
  const [stableSource, setStableSource] = useState<string | null>(source);
  /** 与 stableSource 锁步更新的 segments：保证下游 demo 解析用的是"屏幕上这份内容所属页面"的目录，而非实时路由 */
  const [stableSegments, setStableSegments] = useState<Array<string> | null>(sourceSegments);
  if (source != null && source !== stableSource) {
    setStableSource(source);
    setStableSegments(sourceSegments);
  }

  // 把当前页 mdx + 元信息推给 AI 聊天面板（Sheet 打开时按当前页作为 context）
  const setAiChatCurrentPage = useAiChatStore(s => s.setCurrentPage);
  const aiChatLang: 'zh' | 'en' = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const aiChatTitleKey = target?.label ?? null;
  useEffect(() => {
    if (!loc || !aiChatTitleKey) return;
    const mdx = isChangelog ? changelogToMarkdown(changelog, aiChatLang) : stableSource;
    if (mdx == null) return;
    const title = String(t(aiChatTitleKey));
    const { rawUrl } = buildDocPageLinks(loc, aiChatLang);
    const path = `/${docPathSegments(loc).join('/')}`;
    setAiChatCurrentPage({ title, mdx, lang: aiChatLang, rawUrl, path });
  }, [loc, aiChatTitleKey, stableSource, isChangelog, aiChatLang, t, setAiChatCurrentPage]);
  useEffect(
    () => () => {
      useAiChatStore.getState().setCurrentPage(null);
    },
    [],
  );

  // 把当前页 label 写到 document.title，离开 DocPage 恢复 index.html 的 slogan
  useEffect(() => {
    if (!aiChatTitleKey) return;
    const pageTitle = String(t(aiChatTitleKey));
    const fallback = 'retikz — Draw TikZ figures the React way';
    document.title = `${pageTitle} · retikz`;
    return () => {
      document.title = fallback;
    };
  }, [aiChatTitleKey, t]);

  if (!loc || !section || !target) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-12 text-muted-foreground">
        <p className="text-sm">
          {t('common.notFound', {
            section: loc?.sectionId ?? '-',
            page: loc?.subPageId ?? loc?.pageId ?? '?',
          })}
        </p>
      </main>
    );
  }

  const title = t(target.label);
  const description = isChangelog
    ? changelogPageDescription[aiChatLang]
    : typeof frontmatter.description === 'string'
      ? frontmatter.description
      : null;

  return (
    <main className={cn('@container flex min-w-0 flex-1 w-full p-4 sm:p-6', className)} {...resProps}>
      <div className="flex min-w-0 flex-1 justify-center">
        <div className="flex min-w-0 max-w-180 flex-1 flex-col gap-6">
          <header className="flex flex-col items-start w-full justify-between gap-2">
            <div className="flex w-full items-start justify-between gap-3">
              <h1 className="scroll-m-24 min-w-0 flex-1 text-2xl @[40rem]:text-3xl font-semibold tracking-tight">
                {title}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                {stableSource != null && <DocPageActions source={stableSource} />}
                {target.extra}
              </div>
            </div>
            {loc.moduleId === 'blog' && (
              <BlogFrontmatter
                date={typeof frontmatter.date === 'string' ? frontmatter.date : undefined}
                tags={Array.isArray(frontmatter.tags) ? (frontmatter.tags as Array<string>) : undefined}
              />
            )}
            {description && <InlineMdx source={description} className="text-muted-foreground" />}
            {loc.moduleId === 'blog' && resolvedLang && resolvedLang !== i18n.resolvedLanguage && (
              <div
                role="alert"
                className="w-full rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
              >
                {t('blog.notTranslatedYet')}
              </div>
            )}
          </header>
          <div className="[&_p]:[overflow-wrap:anywhere] [&_li]:[overflow-wrap:anywhere] [&_h1]:[overflow-wrap:anywhere] [&_h2]:[overflow-wrap:anywhere] [&_h3]:[overflow-wrap:anywhere] [&_h4]:[overflow-wrap:anywhere]">
            {isChangelog ? (
              <>
                <div className="mb-6 @[64rem]:hidden">
                  <ChangelogFilter lang={aiChatLang} layout="bar" />
                </div>
                <ChangelogView />
              </>
            ) : notFound ? (
              <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
            ) : (
              <MdxContent source={stableSource} segments={stableSegments} onFrontmatter={setFrontmatter} />
            )}
          </div>
          <DocPageFooterNav />
        </div>
      </div>
      <aside
        aria-hidden={!tocOpen}
        className={cn(
          '@[64rem]:block hidden shrink-0 overflow-clip transition-all duration-300 ease-out px-4',
          tocOpen ? 'w-75 opacity-100' : 'w-0 opacity-0',
        )}
      >
        <div
          className={cn(
            'sticky top-20 transition-all duration-300 ease-out',
            tocOpen ? 'translate-x-0' : 'pointer-events-none translate-x-2',
          )}
        >
          {isChangelog ? <ChangelogFilter lang={aiChatLang} /> : stableSource != null ? <MdxToc source={stableSource} /> : null}
        </div>
      </aside>
    </main>
  );
};
