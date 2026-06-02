import type { CompileOptions } from '@mdx-js/mdx';
import { compile, run } from '@mdx-js/mdx';
import type { MDXContent as MDXContentType } from 'mdx/types';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import { useLocation } from 'react-router';
import rehypeMdxCodeProps from 'rehype-mdx-code-props';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';

import { Skeleton } from '@/components/ui/skeleton';
import { DemoLocationContext } from '@/components/shared/component-preview/demoLocationContext';

import { mdxComponents } from './components';

export type MdxFrontmatter = Record<string, unknown>;

export type MdxContentProps = {
  /** MDX 源码字符串；为 null 时表示路由切换中的过渡态，组件保持上一次成功编译的内容继续渲染 */
  source: string | null;
  /** 与 source 配对的页面 path segments；随已编译 Content 一同存入 state 后经 DemoLocationContext 下发，供 demo 解析定位（避免读实时路由造成切页失步误报） */
  segments?: Array<string> | null;
  /** 编译完成后回调，向上层暴露 frontmatter；source 切换会触发新一轮 */
  onFrontmatter?: (frontmatter: MdxFrontmatter) => void;
};

const runtime = {
  jsx: jsxRuntime.jsx,
  jsxs: jsxRuntime.jsxs,
  jsxDEV: jsxDevRuntime.jsxDEV,
  Fragment: jsxRuntime.Fragment,
};

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: import.meta.env.DEV,
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
  // rehype-slug 给 h1-h6 注 id（TOC 跳转 / 锚链接靠它）；rehype-mdx-code-props 把围栏 meta 转成 JSX props，必须最后跑（把 hast 转 JSX 后下游插件就处理不了了）
  rehypePlugins: [rehypeSlug, [rehypeMdxCodeProps, { tagName: 'code' }]],
};

/** 首次加载尚无任何内容可显示时的占位骨架 */
const ContentSkeleton: FC = () => (
  <div className="flex flex-col gap-3" aria-hidden>
    <Skeleton className="h-4 w-[92%]" />
    <Skeleton className="h-4 w-[96%]" />
    <Skeleton className="h-4 w-[78%]" />
    <Skeleton className="mt-3 h-4 w-[40%]" />
    <Skeleton className="h-4 w-[88%]" />
    <Skeleton className="h-4 w-[83%]" />
    <Skeleton className="mt-3 h-4 w-[30%]" />
    <Skeleton className="h-32 w-full" />
  </div>
);

/**
 * MDX 渲染容器：把 source 字符串编译成组件并挂载
 * @description state.Content 只在新 source 编译成功后才替换，编译期间继续渲染旧组件；source=null 视为路由过渡保持 DOM；仅 Content 为 null（首次加载未完成）才回退到 Skeleton
 */
export const MdxContent: FC<MdxContentProps> = props => {
  const { source, segments, onFrontmatter } = props;
  // Content 与其所属页面的 segments 配对存放：切页过渡时旧 Content 仍在屏幕上，必须配旧 segments 下发，
  // 否则用实时路由(新页)解析旧内容里的 demo 名 → 短暂 "Demo not found"
  const [state, setState] = useState<{ Content: MDXContentType | null; segments: Array<string> | null }>({
    Content: null,
    segments: null,
  });
  const [error, setError] = useState<string | null>(null);
  const { hash } = useLocation();

  useEffect(() => {
    if (source == null) return;
    const controller = new AbortController();
    const { signal } = controller;
    // 本次 source 配对的 segments；与 source 锁步变化（DocPage 同时更新 stableSource / stableSegments），故一并进 deps
    const pageSegments = segments ?? null;

    void (async () => {
      try {
        const compiled = await compile(source, compileOptions);
        const mod = await run(compiled, runtime);
        if (signal.aborted) return;
        const fm = mod.frontmatter;
        const frontmatter = (fm && typeof fm === 'object' ? fm : {}) as MdxFrontmatter;
        onFrontmatter?.(frontmatter);
        setState({ Content: mod.default, segments: pageSegments });
        setError(null);
      } catch (err) {
        if (signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      controller.abort();
    };
  }, [source, segments, onFrontmatter]);

  /** MDX 运行时编译 + 异步挂载 —— 原生 hash 滚动 fail（DOM 还没注入 id）；自接 useLocation + rAF 兜底 */
  useEffect(() => {
    if (state.Content == null || !hash) return;
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    const rafId = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [state.Content, hash]);

  if (error) {
    return <pre className="text-sm whitespace-pre-wrap text-red-500">{error}</pre>;
  }

  const { Content } = state;
  if (!Content) return <ContentSkeleton />;

  return (
    <DemoLocationContext.Provider value={state.segments}>
      <Content components={mdxComponents} />
    </DemoLocationContext.Provider>
  );
};
