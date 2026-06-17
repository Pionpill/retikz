import type { IRMathContent } from '../ir';
import type { PathCommand } from '../primitive';

/**
 * 注入的公式渲染结果——字形路径命令 + 度量（user 单位）
 * @description `commands` 的包围盒约定为左上角在原点、向右下展开（`[0,0]..[width,height]`，屏幕 y-down），
 *   `fillRule='evenodd'` 渲染。`depth` = 基线以下深度（行内混排基线对齐用；独立 / 带框公式可忽略）。
 */
export type LoweredMath = {
  commands: Array<PathCommand>;
  width: number;
  height: number;
  depth: number;
};

/**
 * 把 LaTeX 公式内容渲染成字形路径 + bbox 的注入能力（由 `@retikz/tex` 提供）
 * @description `null` 表示渲染失败（非法 tex）；compile 据此发 `MATH_TEX_INVALID` 降级。core 不依赖 MathJax，
 *   仅声明本注入类型，实现经 `CompileOptions.lowerMath` 传入。
 */
export type LowerMath = (
  content: IRMathContent,
  style: { fontSize: number; color?: string },
) => LoweredMath | null;
