import { cn } from '@/lib/utils';
import { compile, CompileOptions, run, RunOptions } from '@mdx-js/mdx';
import { MDXProvider } from '@mdx-js/react';
import { Draw, Node, PathNode, Scope, TikZ } from '@retikz/core';
import { FC, memo, ReactNode, RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import mdxComponents from './components';

TikZ.displayName = 'TikZ';
Draw.displayName = 'Draw';
Node.displayName = 'Node';
PathNode.displayName = 'PathNode';
Scope.displayName = 'Scope';

// 确保提供正确的 JSX 运行时
const runtime: RunOptions = {
  jsx: jsxRuntime.jsx,
  jsxs: jsxRuntime.jsxs,
  jsxDEV: jsxDevRuntime.jsxDEV,
  Fragment: jsxRuntime.Fragment,
};

export type MdxContentProps = {
  content: string;
  onStatusChange?: (status: 'compiling' | 'error' | 'no-content' | 'compiled' | 'rendered') => void;
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
        } as CompileOptions);

        // 运行编译后的代码
        const { default: Content } = await run(compiled, runtime);
        
        setSource(
          <MDXProvider>
            <Content components={mdxComponents} />
          </MDXProvider>,
        );
        setError(null);
        onStatusChange?.('compiled');
      } catch (err) {
        if (err instanceof Error) setError(err.message);
        setSource(null);
        onStatusChange?.('error');
      }
    };

    compileMdx();
  }, [content, onStatusChange]);

  useLayoutEffect(() => {
    if (source) {
      onStatusChange?.('rendered');
    }
  }, [source])

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
