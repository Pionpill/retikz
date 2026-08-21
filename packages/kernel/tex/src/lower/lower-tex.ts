import type { LowerTex } from '@retikz/core';

import type { MathJaxSvgEngine } from '../mathjax';
import type { LowerTexOptions, TexLoweringResult } from './types';

import { lowerMathJaxSvg } from '../svg';

/** 把同步 SVG engine 适配为 Core LowerTex，并缓存确定结果 */
export const createLowerTex = (engine: MathJaxSvgEngine, options?: LowerTexOptions): LowerTex => {
  const cache = new Map<string, TexLoweringResult<NonNullable<ReturnType<LowerTex>>>>();
  return (content, style) => {
    const key = JSON.stringify([style.fontSize, content.displayMode ?? false, style.color ?? null, content.tex]);
    const cached = cache.get(key);
    if (cached !== undefined) {
      if (!cached.ok) options?.onDiagnostic?.(cached.diagnostic);
      return cached.ok ? cached.value : null;
    }
    let result: TexLoweringResult<NonNullable<ReturnType<LowerTex>>>;
    try {
      const svg = engine.convert(content.tex, { display: content.displayMode ?? false });
      if (svg.includes('data-mml-node="merror"')) {
        const message = /data-mjx-error=(["'])(.*?)\1/.exec(svg)?.[2] ?? 'MathJax returned an error node';
        result = {
          ok: false,
          diagnostic: { kind: 'mathjax-error', source: content.tex, message },
          cacheable: true,
        };
      } else {
        result = lowerMathJaxSvg(svg, style.fontSize, content.tex);
      }
    } catch (error) {
      result = {
        ok: false,
        diagnostic: {
          kind: 'engine-error',
          source: content.tex,
          message: error instanceof Error ? error.message : String(error),
        },
        cacheable: false,
      };
    }
    if (!result.ok) {
      options?.onDiagnostic?.(result.diagnostic);
      if (result.cacheable) cache.set(key, result);
      return null;
    }
    cache.set(key, result);
    return result.value;
  };
};
