import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '@/i18n';
import { LANGS } from '@/i18n';
import { docPathSegments, useDocLocation } from './doc-location';

type MdxLoader = () => Promise<string>;

/**
 * 收集 src/contents 下全部 mdx 源码字符串
 * @description 按需异步加载；key 形如 `../../contents/<module>/<...segments>/index.<lang>.mdx`
 */
const mdxLoaders: Record<string, MdxLoader | undefined> = import.meta.glob<string>(
  '../../contents/**/*.mdx',
  { query: '?raw', import: 'default' },
);

const buildKey = (segments: Array<string>, lang: string) =>
  `../../contents/${segments.join('/')}/index.${lang}.mdx`;

type ResolvedLoader = { loader: MdxLoader; lang: Lang };

/** 优先取当前语言；该语言缺文件时按 LANGS 顺序回退；返回命中的语言以便上层判 fallback */
const resolveLoader = (segments: Array<string>, lang: Lang): ResolvedLoader | null => {
  const candidates = [lang, ...LANGS.filter(l => l !== lang)];
  for (const candidate of candidates) {
    const loader = mdxLoaders[buildKey(segments, candidate)];
    if (loader) return { loader, lang: candidate };
  }
  return null;
};

export type UseMdxSourceResult = {
  /** 解析到的 mdx 字符串；尚未加载完或文件不存在为 null */
  source: string | null;
  /** 与 `source` 配对的页面 path segments（fetch 时的快照）；source 为 null 时同步为 null */
  segments: Array<string> | null;
  /** loader 已命中、内容仍在 fetch 中 */
  isLoading: boolean;
  /** 路径对应的 mdx 文件不存在（含语言回退后仍然找不到） */
  notFound: boolean;
  /** 实际命中的语言；缺当前语言回退到其它语言时即为 fallback 后的 lang */
  resolvedLang: Lang | null;
};

/**
 * 根据当前路由参数 + i18n 当前语言异步加载 mdx 源码
 * @description 兼容 grouped / ungrouped 两种叶子路径；切换路由废弃过期 fetch 结果，避免旧内容覆盖新页面
 */
export const useMdxSource = (): UseMdxSourceResult => {
  const { i18n } = useTranslation();
  const loc = useDocLocation();
  const lang = (i18n.resolvedLanguage ?? 'zh') as Lang;

  const resolved = useMemo(() => {
    if (!loc) return null;
    const segments = docPathSegments(loc);
    const r = resolveLoader(segments, lang);
    return r ? { loader: r.loader, lang: r.lang, segments } : null;
  }, [loc, lang]);

  // 单独把 loader 函数引用拎出来——`mdxLoaders[key]` 同 key 永远同一个函数引用，identity 稳定；
  // 反观 `resolved` 是每次 useMemo 跑出来的新对象字面量，identity 不稳，直接喂给 useEffect 会让 fetch 死循环
  const loader = resolved?.loader ?? null;
  const resolvedLang = resolved?.lang ?? null;
  const pendingSegments = resolved?.segments ?? null;

  const [state, setState] = useState<{ loader: MdxLoader | null; source: string; segments: Array<string> }>({
    loader: null,
    source: '',
    segments: [],
  });

  useEffect(() => {
    if (!loader) return;
    const controller = new AbortController();
    const { signal } = controller;
    // 快照本 loader 对应的 segments：loader 与 segments 一一对应（同 key 同 loader），在 effect 入口闭包捕获即正确
    const segments = pendingSegments ?? [];
    void loader().then(source => {
      if (signal.aborted) return;
      setState({ loader, source, segments });
    });
    return () => {
      controller.abort();
    };
    // 仅依赖 loader：pendingSegments 随 loader 同步变化，故在 effect 入口闭包捕获即正确；
    // 不进 deps 以免 loc 每次新对象身份触发 fetch 死循环（与上方"只拎 loader 引用"同理）
  }, [loader]);

  const isCurrent = state.loader === loader;
  return {
    source: loader && isCurrent ? state.source : null,
    segments: loader && isCurrent ? state.segments : null,
    isLoading: !!loader && !isCurrent,
    notFound: !loader,
    resolvedLang,
  };
};
