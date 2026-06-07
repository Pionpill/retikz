/**
 * renderer 无关的动画播放共享类型（`@retikz/render/animation`）
 * @description 缓动自定义注册表（兑现 ADR-01 预留口）；SVG 用其 cubic-bezier 形式（函数进不了 CSS），
 *   Canvas / WAAPI fallback 用函数形式。ADR-03 在本子路径再加 evaluateTrack / 插值器注册表。
 */

/** cubic-bezier 控制点四元组 [x1, y1, x2, y2] */
export type CubicBezier = [number, number, number, number];
/** 缓动函数：归一化进度 t∈[0,1] → 输出进度 */
export type EasingFn = (t: number) => number;
/** 自定义缓动注册表：名 → cubic-bezier 四元组（CSS / WAAPI 通用）或函数（仅 Canvas / JS） */
export type EasingRegistry = Record<string, CubicBezier | EasingFn>;
