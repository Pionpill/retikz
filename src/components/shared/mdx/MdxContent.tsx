import { compile, CompileOptions, run, RunOptions } from '@mdx-js/mdx';
import { MDXProvider } from '@mdx-js/react';
import { Draw, Node, PathNode, Scope, TikZ } from '@retikz/core';
import { FC, memo, PropsWithChildren, ReactNode, RefObject, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import CodeSpace, { CodeSpaceProps } from './CodeSpace';
import MarkdownAlert, { MarkdownAlertProps } from './MarkdownAlert';
import MarkdownCode, { MarkdownCodeProps } from './MarkdownCode';
import { cn } from '@/lib/utils';

TikZ.displayName = 'TikZ';
Draw.displayName = 'Draw';
Node.displayName = 'Node';
PathNode.displayName = 'PathNode';
Scope.displayName = 'Scope';

export const MDX_ID_PREFIX = 'mdx:';
const getTocAnchor = (name: unknown) => MDX_ID_PREFIX + String(name).replace(/[\s`]+/g, '');

const components = {
  TikZ: TikZ,
  Draw: Draw,
  Node: Node,
  PathNode: PathNode,
  Scope: Scope,
  h1: (props: PropsWithChildren) => (
    <h1 className="text-3xl font-bold mb-6" id={getTocAnchor(props.children)} {...props} />
  ),
  h2: (props: PropsWithChildren) => (
    <h2 className="text-2xl font-bold mt-12 mb-5" id={getTocAnchor(props.children)} {...props} />
  ),
  h3: (props: PropsWithChildren) => (
    <h3 className="text-xl font-bold mt-7 mb-4" id={getTocAnchor(props.children)} {...props} />
  ),
  h4: (props: PropsWithChildren) => (
    <h3 id={getTocAnchor(props.children)} className="text-lg font-bold mt-4 mb-4" {...props} />
  ),
  p: (props: PropsWithChildren) => <p className="mt-4" {...props} />,
  a: (props: PropsWithChildren<{ href: string }>) => (
    <a
      className="text-link hover:text-link-secondary transition-all"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props: PropsWithChildren) => (
    <blockquote className="w-full py-3 pl-6 border-l-2 mt-4 opacity-80" {...props} />
  ),
  code: (props: MarkdownCodeProps) => <MarkdownCode {...props} />,
  ul: (props: PropsWithChildren) => <ul className="my-4 pl-10 list-disc" {...props} />,
  li: (props: PropsWithChildren) => <li className="relative" {...props} />,
  Alert: (props: MarkdownAlertProps) => <MarkdownAlert {...props} />,
  CodeSpace: (props: CodeSpaceProps) => <CodeSpace {...props} />,
};

// 确保提供正确的 JSX 运行时
const runtime: RunOptions = {
  jsx: jsxRuntime.jsx,
  jsxs: jsxRuntime.jsxs,
  jsxDEV: jsxDevRuntime.jsxDEV,
  Fragment: jsxRuntime.Fragment,
};

export type MdxContentProps = {
  content: string;
  onStatusChange?: (status: 'compiling' | 'error' | 'no-content' | 'success') => void;
  ref?: RefObject<HTMLDivElement>;
};

const InnerMdxContent: FC<MdxContentProps> = props => {
  const { content, onStatusChange, ref } = props;

  const [source, setSource] = useState<ReactNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    onStatusChange?.('compiling');
    const compileMdx = async () => {
      if (!content) {
        setSource(null);
        onStatusChange?.('no-content');
        return;
      }

      try {
        // 编译 MDX
        const compiled = await compile(content, {
          outputFormat: 'function-body',
          development: process.env.NODE_ENV === 'development',
          jsxImportSource: 'react',
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        } as CompileOptions);

        // 运行编译后的代码
        const { default: Content } = await run(compiled, runtime);

        setSource(
          <MDXProvider>
            <Content components={components} />
          </MDXProvider>,
        );
        setError(null);
        onStatusChange?.('success');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        setSource(null);
        onStatusChange?.('error');
      }
    };

    compileMdx();
  }, [content, onStatusChange]);

  const commonClassName = "max-w-[800px]";

  if (error) {
    return (
      <div ref={ref} className={cn("p-4 text-red-500 bg-red-50 dark:bg-red-950 rounded-lg", commonClassName)}>
        <h3 className="font-bold mb-2">{t('mdx.error')}</h3>
        <pre className="whitespace-pre-wrap text-sm">{error}</pre>
      </div>
    );
  }

  if (!source) {
    return (
      <div ref={ref} className={cn("p-4 text-muted-foreground", commonClassName)}>
        {t('mdx.compiling')}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("mdx-content", commonClassName)}>
      {source}
    </div>
  );
};

const MdxContent = memo(InnerMdxContent, (pre: MdxContentProps, next: MdxContentProps) => pre.content === next.content);

export default MdxContent;
