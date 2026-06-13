import type { CompileOptions } from '@mdx-js/mdx';
import { compileSync, runSync } from '@mdx-js/mdx';
import type { MDXComponents, MDXContent as MDXContentType } from 'mdx/types';
import type { ComponentPropsWithoutRef, FC } from 'react';
import { useMemo } from 'react';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

import { mdxComponents } from './components';
import { escapeBareJsxTriggers } from './escape-bare-jsx-triggers';

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

export type InlineMdxProps = {
  source: string;
  /** 合并到内部 `<p>` 上的 className——让段落样式由调用方控制（text-muted-foreground 等） */
  className?: string;
  /** 局部覆盖 MDX 元素映射，用于短文本场景微调 strong / code 等局部样式 */
  components?: MDXComponents;
};

/**
 * 单段内联 Markdown 渲染（用于 frontmatter `description` 等短字符串）
 * @description 同步编译 + useMemo 记忆化（省掉 skeleton 与异步状态机）；代码段外裸 `<` 自动转义；`<p>` className 由调用方注入；编译失败回退到原文
 */
export const InlineMdx: FC<InlineMdxProps> = ({ source, className, components: componentOverrides }) => {
  const Content = useMemo<MDXContentType | null>(() => {
    try {
      const compiled = compileSync(escapeBareJsxTriggers(source), compileOptions);
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
      ...componentOverrides,
    }),
    [className, componentOverrides],
  );

  if (!Content) return <p className={className}>{source}</p>;
  return <Content components={components} />;
};
