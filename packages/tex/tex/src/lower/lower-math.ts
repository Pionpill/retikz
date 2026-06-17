import type { LowerMath } from '@retikz/core';
import type { MathJaxSvgEngine } from '../mathjax/engine';
import { parseMathJaxSvg } from '../svg/parse-svg';

/**
 * 用一个同步 tex→SVG 引擎构造 core 的 `LowerMath` 注入函数
 * @description 调 `engine.convert` 取 MathJax SVG，再 `parseMathJaxSvg` 解析成字形 `LoweredMath`；按
 *   `fontSize|display|tex` 缓存（同一公式重复测量 / emit 复用，避免重复跑 MathJax + 解析）。
 *   引擎抛错 / 解析失败 → 返回 `null`，compile 据此发 `MATH_TEX_INVALID` 降级。
 *   注入：`compileToScene(ir, { lowerMath: createLowerMath(engine) })` 或 `<Layout lowerMath={...}>`。
 */
export const createLowerMath = (engine: MathJaxSvgEngine): LowerMath => {
  const cache = new Map<string, ReturnType<LowerMath>>();
  return (content, style) => {
    const key = `${style.fontSize}|${content.displayMode ? 'd' : 'i'}|${content.tex}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let result: ReturnType<LowerMath>;
    try {
      const svg = engine.convert(content.tex, { display: content.displayMode ?? false });
      result = parseMathJaxSvg(svg, style.fontSize);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };
};
