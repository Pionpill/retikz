import type { EllipsePrim } from './ellipse';
import type { GroupPrim } from './group';
import type { PathPrim } from './path';
import type { RectPrim } from './rect';
import type { TextPrim } from './text';
import type { Layout } from './layout';
import type { SceneResource } from './paint';

export type { PaintValue, SceneResource } from './paint';

/**
 * Scene primitive：渲染目标无关的最大公约子集
 * @description 所有 adapter（SVG/Canvas/PDF/Skia）都应能消费；不允许出现 SVG-only 或 Canvas-only 特性（filter/marker/imageData）
 */
export type ScenePrimitive = RectPrim | EllipsePrim | TextPrim | PathPrim | GroupPrim;

/** 场景：渲染目标无关的"已布局好的图元集合 + layout" */
export type Scene = {
  /** 已布局好的图元数组，按渲染顺序排列 */
  primitives: Array<ScenePrimitive>;
  /** 整个场景的布局边界 */
  layout: Layout;
  /** 渲染无关资源表（paint server 等）；adapter 物化（SVG → `<defs>`）。无资源时省略 */
  resources?: Array<SceneResource>;
};
