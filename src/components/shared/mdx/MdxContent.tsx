import { compile, CompileOptions, run, RunOptions } from '@mdx-js/mdx';
import { MDXProvider } from '@mdx-js/react';
import { Draw, Node, PathNode, Scope, TikZ } from '@retikz/core';
import { FC, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import CodeSpace, { CodeSpaceProps } from './CodeSpace';
import MarkdownAlert, { MarkdownAlertProps } from './MarkdownAlert';
import MarkdownCode, { MarkdownCodeProps } from './MarkdownCode';

TikZ.displayName = 'TikZ';
Draw.displayName = 'Draw';
Node.displayName = 'Node';
PathNode.displayName = 'PathNode';
Scope.displayName = 'Scope';

const components = {
  TikZ: TikZ,
  Draw: Draw,
  Node: Node,
  PathNode: PathNode,
  Scope: Scope,
  h1: (props: PropsWithChildren) => <h1 className="text-3xl font-bold mb-6" {...props} />,
  h2: (props: PropsWithChildren) => <h2 className="text-2xl font-bold mt-12 mb-5" {...props} />,
  h3: (props: PropsWithChildren) => <h3 className="text-xl font-bold mt-7 mb-4" {...props} />,
  h4: (props: PropsWithChildren) => <h3 className="text-lg font-bold mt-4 mb-4" {...props} />,
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
  useMDXComponents: () => components,
};

export type MdxContentProps = {
  content: string;
};

const MdxContent: FC<MdxContentProps> = ({ content }) => {
  const [source, setSource] = useState<ReactNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const compileMdx = async () => {
      if (!content) {
        setSource(null);
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
          <MDXProvider components={components}>
            <Content components={components} />
          </MDXProvider>,
        );
        setError(null);
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        setSource(null);
      }
    };

    compileMdx();
  }, [content]);

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 dark:bg-red-950 rounded-lg">
        <h3 className="font-bold mb-2">{t('mdx.error')}</h3>
        <pre className="whitespace-pre-wrap text-sm">{error}</pre>
      </div>
    );
  }

  if (!source) {
    return <div className="p-4 text-muted-foreground">{t('mdx.compiling')}</div>;
  }

  return <div className="mdx-content">{source}</div>;
};

export default MdxContent;
