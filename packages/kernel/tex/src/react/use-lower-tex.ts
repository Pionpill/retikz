import type { LowerTex } from '@retikz/core';

import { useEffect, useRef, useState } from 'react';

import type { MathJaxLowerTexOptions } from '../lower';
import type { MathJaxSvgEngine } from '../mathjax';
import type { ResolvedMathJaxEngineOptions } from '../mathjax/types';

import { createLowerTex } from '../lower';
import { createMathJaxEngine } from '../mathjax';
import { resolveMathJaxEngineOptions } from '../mathjax/profiles';

type EngineEntry = {
  promise: Promise<MathJaxSvgEngine>;
  diagnosticReported: boolean;
};

const engineEntries = new Map<string, EngineEntry>();

/** 获取按 canonical profile / extensions 分桶的共享 MathJax 引擎 */
const getEngine = (options: ResolvedMathJaxEngineOptions): EngineEntry => {
  const cached = engineEntries.get(options.key);
  if (cached) return cached;
  const entry: EngineEntry = {
    promise: Promise.resolve(undefined as never),
    diagnosticReported: false,
  };
  const promise = createMathJaxEngine({
    profile: options.profile,
    extensions: options.extensions,
  }).catch(error => {
    if (engineEntries.get(options.key) === entry) engineEntries.delete(options.key);
    throw error;
  });
  entry.promise = promise;
  engineEntries.set(options.key, entry);
  return entry;
};

/** 异步创建并按配置共享 MathJax lowerer */
export const useLowerTex = (options?: MathJaxLowerTexOptions): LowerTex | undefined => {
  const resolved = resolveMathJaxEngineOptions(options);
  const diagnosticRef = useRef(options?.onDiagnostic);
  const requestRef = useRef(0);
  const [lower, setLower] = useState<LowerTex>();
  diagnosticRef.current = options?.onDiagnostic;

  useEffect(() => {
    const token = ++requestRef.current;
    let alive = true;
    setLower(undefined);
    const entry = getEngine(resolved);
    void entry.promise
      .then(engine => {
        if (!alive || requestRef.current !== token) return;
        const forwardDiagnostic: NonNullable<MathJaxLowerTexOptions['onDiagnostic']> = diagnostic => {
          diagnosticRef.current?.(diagnostic);
        };
        setLower(() => createLowerTex(engine, { onDiagnostic: forwardDiagnostic }));
      })
      .catch(error => {
        if (!alive || requestRef.current !== token || entry.diagnosticReported) return;
        const onDiagnostic = diagnosticRef.current;
        if (!onDiagnostic) return;
        entry.diagnosticReported = true;
        onDiagnostic({
          kind: 'engine-error',
          source: '',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      alive = false;
    };
  }, [resolved.key]);

  return lower;
};
