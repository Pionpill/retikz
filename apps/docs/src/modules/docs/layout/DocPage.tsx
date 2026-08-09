import type { FC, HTMLAttributes } from 'react';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MdxFrontmatter } from '@/modules/docs/components';

import { cn } from '@/lib';
import {
  ChangelogOverview,
  ChangelogVersionDetail,
  InlineMdx,
  isShowcaseFamilyValue,
  isShowcaseUsageValue,
  MdxContent,
  MdxToc,
  ShowcaseMetadataBadges,
} from '@/modules/docs/components';
import { changelogForModule, changelogPageDescription, changelogVersionSlug } from '@/modules/docs/data';
import { useTocStore } from '@/modules/docs/store';

import { BlogFrontmatter } from './BlogFrontmatter';
import { resolveDocPagePresentation } from './doc-page-presentation';
import { DocPageActions } from './DocPageActions';
import { DocPageFooterNav } from './DocPageFooterNav';
import { useDocLocation } from './useDocLocation';
import { useDocPageEffects } from './useDocPageEffects';
import { useDocPageNode } from './useDocPageNode';
import { useMdxSource } from './useMdxSource';
import { useStableMdxSource } from './useStableMdxSource';
import { isChangelogLocation } from './utils';

export type DocPageProps = HTMLAttributes<HTMLDivElement>;

/**
 * 文档页渲染器
 * @description 用 stableSource 保留上一次非空 source，路由切换时下游继续看见旧内容直至新 mdx 编译就绪，避免空白闪烁
 */
export const DocPage: FC<DocPageProps> = props => {
  const { className, ...resProps } = props;

  const { t, i18n } = useTranslation();
  const loc = useDocLocation();
  const { section, target } = useDocPageNode(loc);

  const { source, segments: sourceSegments, notFound, resolvedLang, error } = useMdxSource();
  const tocOpen = useTocStore(state => state.tocOpen);

  /** changelog 页走数据驱动渲染，不走 mdx 管线。 */
  const isChangelog = isChangelogLocation(loc);
  const moduleId = loc?.moduleId;
  const sectionId = loc?.sectionId;
  /** 当前模块与分组的 changelog 切片；非 changelog 页为空。 */
  const changelogReleases = useMemo(
    () => (isChangelog && moduleId ? changelogForModule(moduleId, sectionId ?? undefined) : []),
    [isChangelog, moduleId, sectionId],
  );
  /** 分组节点本身（无 subPage）为精简概览；带 subPage 时按 slug 命中某中版本详情 */
  const isChangelogOverview = isChangelog && loc?.subPageId == null;
  const changelogVersion = useMemo(() => {
    const sub = loc?.subPageId;
    if (!isChangelog || !sub) return undefined;
    return changelogReleases.find(release => changelogVersionSlug(release.minor) === sub);
  }, [isChangelog, loc?.subPageId, changelogReleases]);

  const [frontmatter, setFrontmatter] = useState<MdxFrontmatter>({});
  const { stableSource, stableSegments } = useStableMdxSource(source, sourceSegments);

  const pagePresentation = useMemo(
    () =>
      resolveDocPagePresentation({
        layout: target?.meta?.layout ?? 'article',
        source: stableSource,
        isChangelog,
      }),
    [target?.meta?.layout, stableSource, isChangelog],
  );
  const { contentClassName, hasToc } = pagePresentation;
  const aiChatLang: 'zh' | 'en' = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const aiChatTitleKey = target?.label ?? null;
  useDocPageEffects({
    loc,
    titleKey: aiChatTitleKey,
    stableSource,
    hasToc,
    isChangelog,
    changelogReleases,
    changelogVersion,
    lang: aiChatLang,
    t,
  });

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
  const isShowcase = target.meta?.layout === 'showcase';
  const showcaseFamily = isShowcase && isShowcaseFamilyValue(frontmatter.family) ? frontmatter.family : undefined;
  const showcaseUsage = isShowcase && isShowcaseUsageValue(frontmatter.usage) ? frontmatter.usage : undefined;
  const description = isChangelog
    ? isChangelogOverview
      ? changelogPageDescription[aiChatLang]
      : null
    : typeof frontmatter.description === 'string'
      ? frontmatter.description
      : null;

  return (
    <main className={cn('@container flex min-w-0 flex-1 w-full', className)} {...resProps}>
      <div className="flex min-w-0 flex-1 justify-center p-6">
        <div className={cn('flex min-w-0 flex-1 flex-col gap-6', contentClassName)}>
          <header className="flex flex-col items-start w-full justify-between gap-2">
            <div className="flex w-full items-start justify-between gap-3">
              <h1 className="scroll-m-24 min-w-0 flex-1 text-2xl @[40rem]:text-3xl font-semibold tracking-tight">
                {title}
              </h1>
              <div className="flex shrink-0 items-center gap-2">
                {stableSource != null && <DocPageActions source={stableSource} difficulty={target.difficulty} />}
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
            {isShowcase && <ShowcaseMetadataBadges family={showcaseFamily} usage={showcaseUsage} />}
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
                <ChangelogOverview
                  releases={changelogReleases}
                  moduleId={loc.moduleId}
                  sectionId={loc.sectionId ?? 'releases'}
                />
              ) : changelogVersion ? (
                <ChangelogVersionDetail release={changelogVersion} />
              ) : (
                <p className="text-sm text-muted-foreground">{t('common.contentPlaceholder', { title })}</p>
              )
            ) : error ? (
              <div
                role="alert"
                className="w-full rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </div>
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
            '@[64rem]:block hidden shrink-0 overflow-clip transition-all duration-300 ease-out',
            tocOpen ? 'w-55 opacity-100' : 'w-0 opacity-0',
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
