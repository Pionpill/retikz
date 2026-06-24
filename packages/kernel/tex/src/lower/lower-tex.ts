import type { LowerTex } from '@retikz/core';
import type { MathJaxSvgEngine } from '../mathjax/engine';
import { parseMathJaxSvg } from '../svg/parse-svg';

export const createLowerTex = (engine: MathJaxSvgEngine): LowerTex => {
  const cache = new Map<string, ReturnType<LowerTex>>();
  return (content, style) => {
    const key = `${style.fontSize}|${content.displayMode ? 'd' : 'i'}|${content.tex}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let result: ReturnType<LowerTex>;
    try {
      const svg = engine.convert(content.tex, { display: content.displayMode ?? false });
      result = svg.includes('data-mml-node="merror"') ? null : parseMathJaxSvg(svg, style.fontSize);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };
};
