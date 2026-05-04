import type { CompileOptions } from '@mdx-js/mdx';
import { compile, run } from '@mdx-js/mdx';
import type { MDXContent as MDXContentType } from 'mdx/types';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { mdxComponents } from './components';

export type MdxFrontmatter = Record<string, unknown>;

export type MdxContentProps = {
  /** MDX 源码字符串 */
  source: string;
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
};

export const MdxContent: FC<MdxContentProps> = props => {
  const { source, onFrontmatter } = props;
  const [Content, setContent] = useState<MDXContentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        const compiled = await compile(source, compileOptions);
        const mod = await run(compiled, runtime);
        if (signal.aborted) return;
        const fm = mod.frontmatter;
        const frontmatter = (fm && typeof fm === 'object' ? fm : {}) as MdxFrontmatter;
        onFrontmatter?.(frontmatter);
        setContent(() => mod.default);
        setError(null);
      } catch (err) {
        if (signal.aborted) return;
        setContent(null);
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      controller.abort();
    };
  }, [source, onFrontmatter]);

  if (error) {
    return <pre className="text-sm whitespace-pre-wrap text-red-500">{error}</pre>;
  }

  if (!Content) return null;

  return <Content components={mdxComponents} />;
};
