import type { Figure } from '../figure';

/** Figure 品牌标记（Symbol.for 跨包/重复 import 仍同一）；标准 mountSvg/renderToSvgString 用它区分 Figure 与 IR/Scene */
export const FIGURE_BRAND: unique symbol = Symbol.for('retikz.vanilla.figure');

/** 运行时判断一个值是不是 Figure（带 brand）；纯结构检查、零内部 import → 不与 mountSvg/Figure 形成运行时环 */
export const isFigure = (value: unknown): value is Figure =>
  typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[FIGURE_BRAND] === true;
