import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import type { Lang } from '@/i18n';
import { LANGS } from '@/i18n';

type MdxLoader = () => Promise<string>;

/**
 * 收集 src/contents 下全部 mdx 源码字符串，按需异步加载。
 * key 形如 '../../contents/core/profile/introduction/zh.mdx' 或更深层的
 * '../../contents/core/core/core-intro/core-intro/zh.mdx'
 */
const mdxLoaders: Record<string, MdxLoader | undefined> = import.meta.glob<string>(
  '../../contents/**/*.mdx',
  { query: '?raw', import: 'default' },
);

const buildKey = (segments: Array<string>, lang: string) =>
  `../../contents/${segments.join('/')}/${lang}.mdx`;

/** 优先取当前语言；该语言缺文件时按 LANGS 顺序回退 */
const resolveLoader = (segments: Array<string>, lang: Lang) => {
  const candidates = [lang, ...LANGS.filter(l => l !== lang)];
  for (const candidate of candidates) {
    const loader = mdxLoaders[buildKey(segments, candidate)];
    if (loader) return loader;
  }
  return null;
};

export type UseMdxSourceResult = {
  /** 解析到的 mdx 字符串；尚未加载完或文件不存在为 null */
  source: string | null;
  /** loader 已命中、内容仍在 fetch 中 */
  isLoading: boolean;
  /** 路径对应的 mdx 文件不存在（含语言回退后仍然找不到） */
  notFound: boolean;
};

/**
 * 根据当前路由参数 + i18n 当前语言异步加载 mdx 源码。
 * 支持 3 段 (`:moduleId/:sectionId/:pageId`) 和 4 段 (`...:subPageId`) 两种叶子路径。
 * 切换路由时会废弃过期的 fetch 结果，避免旧内容覆盖新页面。
 */
export const useMdxSource = (): UseMdxSourceResult => {
  const { i18n } = useTranslation();
  const { moduleId, sectionId, pageId, subPageId } = useParams<
    'moduleId' | 'sectionId' | 'pageId' | 'subPageId'
  >();
  const lang = (i18n.resolvedLanguage ?? 'zh') as Lang;

  const loader = useMemo(() => {
    if (!moduleId || !sectionId || !pageId) return null;
    const segments = subPageId
      ? [moduleId, sectionId, pageId, subPageId]
      : [moduleId, sectionId, pageId];
    return resolveLoader(segments, lang);
  }, [moduleId, sectionId, pageId, subPageId, lang]);

  const [state, setState] = useState<{ loader: MdxLoader | null; source: string }>({
    loader: null,
    source: '',
  });

  useEffect(() => {
    if (!loader) return;
    const controller = new AbortController();
    const { signal } = controller;
    void loader().then(source => {
      if (signal.aborted) return;
      setState({ loader, source });
    });
    return () => {
      controller.abort();
    };
  }, [loader]);

  const isCurrent = state.loader === loader;
  return {
    source: loader && isCurrent ? state.source : null,
    isLoading: !!loader && !isCurrent,
    notFound: !loader,
  };
};
