import type { CompileOptions } from '@mdx-js/mdx';
import { compileSync, runSync } from '@mdx-js/mdx';
import type { MDXContent as MDXContentType } from 'mdx/types';
import type { ComponentPropsWithoutRef, FC } from 'react';
import { useMemo } from 'react';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

import { mdxComponents } from './components';

const runtime = {
  jsx: jsxRuntime.jsx,
  jsxs: jsxRuntime.jsxs,
  jsxDEV: jsxDevRuntime.jsxDEV,
  Fragment: jsxRuntime.Fragment,
};

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: import.meta.env.DEV,
  remarkPlugins: [remarkGfm],
};

/**
 * 给代码段（单 backtick）外的裸 `<` 加反斜杠转义，避免 MDX 把 `<Tag>` 当 JSX 解析。
 * CommonMark 中 `\<` 是 ASCII punctuation 转义，渲染回字面量 `<`。
 */
const escapeBareAngles = (source: string): string =>
  source
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 0 ? part.replace(/</g, '\\<') : part))
    .join('');

export type InlineMdxProps = {
  source: string;
  /** 合并到内部 `<p>` 上的 className——让段落样式由调用方控制（text-muted-foreground 等） */
  className?: string;
};

/**
 * 单段内联 Markdown 渲染：用于 frontmatter `description` 等短字符串场景。
 *
 * 与 MdxContent 的差异：
 *  - 同步编译 + useMemo 记忆化：输入短，省掉 skeleton 与异步状态机
 *  - 代码段外裸 `<` 自动转义：description 中写 `<Tag>` 字面量不会触发 JSX 解析失败
 *  - `<p>` className 由调用方注入：与外层段落样式一致，不强加 mdxComponents 的 margin
 *  - 编译失败回退到原文（含 backticks 等字面量），保证最坏情况下也能看见原始描述
 */
export const InlineMdx: FC<InlineMdxProps> = ({ source, className }) => {
  const Content = useMemo<MDXContentType | null>(() => {
    try {
      const compiled = compileSync(escapeBareAngles(source), compileOptions);
      const mod = runSync(compiled, runtime);
      return mod.default;
    } catch {
      return null;
    }
  }, [source]);

  const components = useMemo(
    () => ({
      ...mdxComponents,
      p: ({ className: c, ...rest }: ComponentPropsWithoutRef<'p'>) => <p className={cn(className, c)} {...rest} />,
    }),
    [className],
  );

  if (!Content) return <p className={className}>{source}</p>;
  return <Content components={components} />;
};
