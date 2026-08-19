import type { LowerTex } from '@retikz/core';

import { useEffect, useRef, useState } from 'react';

import type { MathJaxLowerTexOptions, TexLoweringDiagnostic } from '../lower';
import type { MathJaxExtensionValue, MathJaxSvgEngine } from '../mathjax';

import { createLowerTex } from '../lower';
import { createMathJaxEngine, resolveMathJaxExtensions } from '../mathjax';

type EngineEntry = {
  promise: Promise<MathJaxSvgEngine>;
  diagnosticReported: boolean;
};

/** MathJax lowerer 的异步初始化状态 */
export type MathJaxLowerTexState =
  | { status: 'loading' }
  | { status: 'ready'; lowerTex: LowerTex }
  | { status: 'error'; diagnostic: TexLoweringDiagnostic };

type LowerTexStateEntry = {
  key: string;
  state: MathJaxLowerTexState;
};

const engineEntries = new Map<string, EngineEntry>();

/** 根据规范化配置生成 React engine 缓存键 */
const getEngineKey = (extensions: ReadonlyArray<MathJaxExtensionValue>): string => extensions.join(',');

/** 获取按有效 extension 集合分桶的共享 MathJax 引擎 */
const getEngine = (extensions: Array<MathJaxExtensionValue>, key: string): EngineEntry => {
  const cached = engineEntries.get(key);
  if (cached) return cached;
  const entry: EngineEntry = {
    promise: createMathJaxEngine({
      extensions,
    }),
    diagnosticReported: false,
  };
  entry.promise = entry.promise.catch(error => {
    if (engineEntries.get(key) === entry) engineEntries.delete(key);
    throw error;
  });
  engineEntries.set(key, entry);
  return entry;
};

/** 按有效配置共享 MathJax engine，并异步创建当前 hook 的 lowerer */
export const useLowerTex = (options?: MathJaxLowerTexOptions): MathJaxLowerTexState => {
  const extensions = resolveMathJaxExtensions(options);
  const engineKey = getEngineKey(extensions);
  const diagnosticRef = useRef(options?.onDiagnostic);
  const requestRef = useRef(0);
  const [stateEntry, setStateEntry] = useState<LowerTexStateEntry>(() => ({
    key: engineKey,
    state: { status: 'loading' },
  }));
  diagnosticRef.current = options?.onDiagnostic;

  useEffect(() => {
    const token = ++requestRef.current;
    let alive = true;
    setStateEntry({ key: engineKey, state: { status: 'loading' } });
    const entry = getEngine(extensions, engineKey);
    void entry.promise
      .then(engine => {
        if (!alive || requestRef.current !== token) return;
        const forwardDiagnostic: NonNullable<MathJaxLowerTexOptions['onDiagnostic']> = diagnostic => {
          diagnosticRef.current?.(diagnostic);
        };
        setStateEntry({
          key: engineKey,
          state: { status: 'ready', lowerTex: createLowerTex(engine, { onDiagnostic: forwardDiagnostic }) },
        });
      })
      .catch(error => {
        if (!alive || requestRef.current !== token) return;
        const diagnostic: TexLoweringDiagnostic = {
          kind: 'engine-error',
          source: '',
          message: error instanceof Error ? error.message : String(error),
        };
        setStateEntry({ key: engineKey, state: { status: 'error', diagnostic } });
        if (entry.diagnosticReported) return;
        const onDiagnostic = diagnosticRef.current;
        if (!onDiagnostic) return;
        entry.diagnosticReported = true;
        onDiagnostic(diagnostic);
      });
    return () => {
      alive = false;
    };
  }, [engineKey]);

  return stateEntry.key === engineKey ? stateEntry.state : { status: 'loading' };
};
