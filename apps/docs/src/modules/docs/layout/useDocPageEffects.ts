import type { TFunction } from 'i18next';

import { useEffect } from 'react';

import type { I18nKey, Release } from '@/modules/docs/data';

import { useAiChatStore } from '@/modules/docs/ai-chat';
import { changelogToMarkdown } from '@/modules/docs/components/changelog';
import { buildDocPageLinks } from '@/modules/docs/lib/doc-links';
import { useTocStore } from '@/modules/docs/store';

import type { DocLocation } from './doc-location';

import { docPathSegments } from './doc-location';

/** 文档页全局副作用输入。 */
export type DocPageEffectsInput = {
  loc: DocLocation | null;
  titleKey: I18nKey | null;
  stableSource: string | null;
  hasToc: boolean;
  isChangelog: boolean;
  changelogReleases: Array<Release>;
  changelogVersion?: Release;
  lang: 'zh' | 'en';
  t: TFunction;
};

/** 同步文档页关联的 TOC、AI 当前页和 document.title。 */
export const useDocPageEffects = (input: DocPageEffectsInput): void => {
  const { loc, titleKey, stableSource, hasToc, isChangelog, changelogReleases, changelogVersion, lang, t } = input;
  const setHasToc = useTocStore(state => state.setHasToc);
  const setAiChatCurrentPage = useAiChatStore(state => state.setCurrentPage);

  useEffect(() => {
    setHasToc(hasToc);
  }, [hasToc, setHasToc]);

  useEffect(() => {
    if (!loc || !titleKey) return;
    const mdx = isChangelog
      ? changelogToMarkdown(changelogVersion ? [changelogVersion] : changelogReleases, lang)
      : stableSource;
    if (mdx == null) return;
    const title = String(t(titleKey));
    const { rawUrl } = buildDocPageLinks(loc, lang);
    const path = `/${docPathSegments(loc).join('/')}`;
    setAiChatCurrentPage({ title, mdx, lang, rawUrl, path });
  }, [loc, titleKey, stableSource, isChangelog, changelogReleases, changelogVersion, lang, t, setAiChatCurrentPage]);

  useEffect(
    () => () => {
      useAiChatStore.getState().setCurrentPage(null);
      useTocStore.getState().setHasToc(false);
    },
    [],
  );

  useEffect(() => {
    if (!titleKey) return;
    const fallback = 'retikz — Draw TikZ figures the React way';
    document.title = `${String(t(titleKey))} · retikz`;
    return () => {
      document.title = fallback;
    };
  }, [titleKey, t]);
};
