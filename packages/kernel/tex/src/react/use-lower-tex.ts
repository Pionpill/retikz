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
const formatEngineCacheKey = (extensions: ReadonlyArray<MathJaxExtensionValue>): string => extensions.join(',');

/** 获取或创建按有效 extension 集合分桶的共享 MathJax 引擎条目 */
const getOrCreateEngineEntry = (extensions: Array<MathJaxExtensionValue>, engineKey: string): EngineEntry => {
  const cachedEntry = engineEntries.get(engineKey);
  if (cachedEntry) return cachedEntry;
  const engineEntry: EngineEntry = {
    promise: createMathJaxEngine({
      extensions,
    }),
    diagnosticReported: false,
  };
  engineEntry.promise = engineEntry.promise.catch(error => {
    if (engineEntries.get(engineKey) === engineEntry) engineEntries.delete(engineKey);
    throw error;
  });
  engineEntries.set(engineKey, engineEntry);
  return engineEntry;
};

/** 按有效配置共享 MathJax engine，并异步创建当前 hook 的 lowerer */
export const useLowerTex = (options?: MathJaxLowerTexOptions): MathJaxLowerTexState => {
  const extensions = resolveMathJaxExtensions(options);
  const engineKey = formatEngineCacheKey(extensions);
  const diagnosticRef = useRef(options?.onDiagnostic);
  const requestRef = useRef(0);
  const [stateEntry, setStateEntry] = useState<LowerTexStateEntry>(() => ({
    key: engineKey,
    state: { status: 'loading' },
  }));
  diagnosticRef.current = options?.onDiagnostic;

  useEffect(() => {
    const requestToken = ++requestRef.current;
    let isEffectActive = true;
    setStateEntry({ key: engineKey, state: { status: 'loading' } });
    const engineEntry = getOrCreateEngineEntry(extensions, engineKey);
    void engineEntry.promise
      .then(engine => {
        if (!isEffectActive || requestRef.current !== requestToken) return;
        const forwardDiagnostic: NonNullable<MathJaxLowerTexOptions['onDiagnostic']> = diagnostic => {
          diagnosticRef.current?.(diagnostic);
        };
        setStateEntry({
          key: engineKey,
          state: { status: 'ready', lowerTex: createLowerTex(engine, { onDiagnostic: forwardDiagnostic }) },
        });
      })
      .catch(error => {
        if (!isEffectActive || requestRef.current !== requestToken) return;
        const diagnostic: TexLoweringDiagnostic = {
          kind: 'engine-error',
          source: '',
          message: error instanceof Error ? error.message : String(error),
        };
        setStateEntry({ key: engineKey, state: { status: 'error', diagnostic } });
        if (engineEntry.diagnosticReported) return;
        const onDiagnostic = diagnosticRef.current;
        if (!onDiagnostic) return;
        engineEntry.diagnosticReported = true;
        onDiagnostic(diagnostic);
      });
    return () => {
      isEffectActive = false;
    };
  }, [engineKey]);

  return stateEntry.key === engineKey ? stateEntry.state : { status: 'loading' };
};
