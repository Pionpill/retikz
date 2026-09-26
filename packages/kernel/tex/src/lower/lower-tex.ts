import type { LowerTex } from '@retikz/core';

import type { MathJaxSvgEngine } from '../mathjax';
import { lowerMathJaxSvg } from '../svg';
import type { LowerTexOptions, TexLoweringResult } from './types';

/**
 * 把同步 SVG engine 适配为 Core `LowerTex`，并缓存确定的解析结果
 *
 * @description 接收能输出受支持 SVG 子集的引擎与可选诊断回调，返回可直接注入 Core 文本编译流程的同步 lowerer。该函数负责 TeX → SVG → 路径的降解和结果缓存，不负责初始化引擎或渲染公式
 * @param engine 提供同步 TeX → SVG 转换能力的引擎
 * @param options 控制 lowering 失败诊断的可选配置
 * @returns 同步 LowerTex；转换失败时返回 null 并通知 onDiagnostic，缓存命中的失败也会再次通知
 *
 * @example
 * import { createLowerTex, createMathJaxEngine, MathJaxProfile } from '@retikz/tex';
 *
 * const engine = await createMathJaxEngine({ profile: MathJaxProfile.Math });
 * const lowerTex = createLowerTex(engine, {
 *   onDiagnostic: diagnostic => console.warn(diagnostic.message),
 * });
 */
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
