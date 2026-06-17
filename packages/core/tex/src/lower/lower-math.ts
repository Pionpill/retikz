import type { LowerMath } from '@retikz/core';
import type { MathJaxSvgEngine } from '../mathjax/engine';
import { parseMathJaxSvg } from '../svg/parse-svg';

/**
 * 用一个同步 tex→SVG 引擎构造 core 的 `LowerMath` 注入函数
 * @description 调 `engine.convert` 取 MathJax SVG，再 `parseMathJaxSvg` 解析成字形 `LoweredMath`；按
 *   `fontSize|display|tex` 缓存（同一公式重复测量 / emit 复用，避免重复跑 MathJax + 解析）。
 *   返回 `null`（compile 据此发 `MATH_TEX_INVALID` 降级）的三种情形：引擎抛错、解析失败、**MathJax 报错节点
 *   `merror`**（如括号不配对等真实语法错误——MathJax 把它渲染成红色错误标记，不应当成正常公式）。
 *   注意：未知命令等 MathJax 容错渲染（按字面排版、不产 merror）的输入不视为错误、正常出图。
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
      // MathJax 语法错误产出 merror 节点（红色错误标记）→ 视作渲染失败，让 compile 走 MATH_TEX_INVALID
      result = svg.includes('data-mml-node="merror"') ? null : parseMathJaxSvg(svg, style.fontSize);
    } catch {
      result = null;
    }
    cache.set(key, result);
    return result;
  };
};
