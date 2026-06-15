import { BlogFrontmatter } from '@/components/shared/blog-frontmatter';
import type { MdxFrontmatter } from '@/components/shared/mdx-content';
import { ChangelogOverview, ChangelogVersionDetail, changelogToMarkdown } from '@/components/shared/changelog';
import { InlineMdx, MdxContent, MdxToc, mdxHasToc } from '@/components/shared/mdx-content';
import { changelogForModule, changelogPageDescription, changelogVersionSlug } from '@/data/changelog';
import { getSectionsByModule } from '@/data/sections';
import { buildDocPageLinks } from '@/lib/doc-links';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/use-ai-chat-store';
import { useTocStore } from '@/store/use-toc-store';
import type { FC, HTMLAttributes } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { docPathSegments, isChangelogLocation, useDocLocation } from './doc-location';
import { DocPageActions } from './DocPageActions';
import { DocPageFooterNav } from './DocPageFooterNav';
import { useMdxSource } from './use-mdx-source';

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
  const setHasToc = useTocStore(state => state.setHasToc);

  /** changelog 页走数据驱动渲染,不走 mdx 管线（releases/changelog 分组下的概览与各中版本详情子页） */
  const isChangelog = isChangelogLocation(loc);
  const moduleId = loc?.moduleId;
  /** 当前模块的 changelog 切片（core / plot 各取自己包组）；非 changelog 页为空 */
  const changelogReleases = useMemo(
    () => (isChangelog && moduleId ? changelogForModule(moduleId) : []),
    [isChangelog, moduleId],
  );
  /** 分组节点本身（无 subPage）为精简概览；带 subPage 时按 slug 命中某中版本详情 */
  const isChangelogOverview = isChangelog && loc?.subPageId == null;
  const changelogVersion = useMemo(() => {
    const sub = loc?.subPageId;
    if (!isChangelog || !sub) return undefined;
    return changelogReleases.find(release => changelogVersionSlug(release.minor) === sub);
  }, [isChangelog, loc?.subPageId, changelogReleases]);

  const [frontmatter, setFrontmatter] = useState<MdxFrontmatter>({});
  /** 始终保留上一次非 null 的 source；过渡态时下游继续看见旧内容直至新 mdx 编译就绪 */
  const [stableSource, setStableSource] = useState<string | null>(source);
  /** 与 stableSource 锁步更新的 segments：保证下游 demo 解析用的是"屏幕上这份内容所属页面"的目录，而非实时路由 */
  const [stableSegments, setStableSegments] = useState<Array<string> | null>(sourceSegments);
  if (source != null && source !== stableSource) {
    setStableSource(source);
    setStableSegments(sourceSegments);
  }

  /** 当前页是否有右栏目录内容：changelog 页无目录，mdx 页需含 h1-h3。无内容时右栏不渲染、不占位 */
  const hasToc = useMemo(
    () => !isChangelog && stableSource != null && mdxHasToc(stableSource),
    [isChangelog, stableSource],
  );
  useEffect(() => {
    setHasToc(hasToc);
  }, [hasToc, setHasToc]);

  // 把当前页 mdx + 元信息推给 AI 聊天面板（Sheet 打开时按当前页作为 context）
  const setAiChatCurrentPage = useAiChatStore(s => s.setCurrentPage);
  const aiChatLang: 'zh' | 'en' = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const aiChatTitleKey = target?.label ?? null;
  useEffect(() => {
    if (!loc || !aiChatTitleKey) return;
    const mdx = isChangelog
      ? changelogToMarkdown(changelogVersion ? [changelogVersion] : changelogReleases, aiChatLang)
      : stableSource;
    if (mdx == null) return;
    const title = String(t(aiChatTitleKey));
    const { rawUrl } = buildDocPageLinks(loc, aiChatLang);
    const path = `/${docPathSegments(loc).join('/')}`;
    setAiChatCurrentPage({ title, mdx, lang: aiChatLang, rawUrl, path });
  }, [loc, aiChatTitleKey, stableSource, isChangelog, changelogReleases, changelogVersion, aiChatLang, t, setAiChatCurrentPage]);
  useEffect(
    () => () => {
      useAiChatStore.getState().setCurrentPage(null);
      useTocStore.getState().setHasToc(false);
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
    ? isChangelogOverview
      ? changelogPageDescription[aiChatLang]
      : null
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
            {loc.sectionId === 'blog' && (
              <BlogFrontmatter
                date={typeof frontmatter.date === 'string' ? frontmatter.date : undefined}
                tags={Array.isArray(frontmatter.tags) ? (frontmatter.tags as Array<string>) : undefined}
              />
            )}
            {description && <InlineMdx source={description} className="text-muted-foreground" />}
            {loc.sectionId === 'blog' && resolvedLang && resolvedLang !== i18n.resolvedLanguage && (
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
              isChangelogOverview ? (
                <ChangelogOverview releases={changelogReleases} moduleId={loc.moduleId} />
              ) : changelogVersion ? (
                <ChangelogVersionDetail release={changelogVersion} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
              )
            ) : notFound ? (
              <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
            ) : (
              <MdxContent source={stableSource} segments={stableSegments} onFrontmatter={setFrontmatter} />
            )}
          </div>
          <DocPageFooterNav />
        </div>
      </div>
      {hasToc && stableSource != null && (
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
            <MdxToc source={stableSource} />
          </div>
        </aside>
      )}
    </main>
  );
};
