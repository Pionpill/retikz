import type { GroupPrim } from './group';
import type { PathPrim } from './path';
import type { RectPrim } from './rect';
import type { TextPrim } from './text';
import type { ViewBox } from './view-box';

/**
 * Scene primitive：渲染目标无关的最大公约子集。
 * 所有 adapter（SVG / Canvas / PDF / Skia）都应能消费这些原语。
 *
 * 不允许出现 SVG-only 或 Canvas-only 特性（filter、marker、imageData 等）。
 * 见 docs/DESIGN.md §4.4。
 */
export type ScenePrimitive = RectPrim | TextPrim | PathPrim | GroupPrim;

/** 场景：渲染目标无关的"已布局好的图元集合 + viewBox" */
export type Scene = {
  /** 已布局好的图元数组，按渲染顺序排列 */
  primitives: Array<ScenePrimitive>;
  /** 整个场景的视口范围 */
  viewBox: ViewBox;
};
