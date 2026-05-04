import type { CompileOptions } from '@mdx-js/mdx';
import { compile, run } from '@mdx-js/mdx';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

export type MdxContentProps = {
  /** MDX 源码字符串 */
  source: string;
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
  remarkPlugins: [remarkGfm],
};

export const MdxContent: FC<MdxContentProps> = props => {
  const { source } = props;
  const [Content, setContent] = useState<FC | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      try {
        const compiled = await compile(source, compileOptions);
        const mod = await run(compiled, runtime);
        if (signal.aborted) return;
        setContent(() => mod.default as FC);
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
  }, [source]);

  if (error) {
    return <pre className="text-sm whitespace-pre-wrap text-red-500">{error}</pre>;
  }

  if (!Content) return null;

  return <Content />;
};
