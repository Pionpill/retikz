import type { BoundsRect } from '@retikz/math';

import type { IRAnimationTrack } from '../../schemas';
import type { EllipsePrimitive } from './ellipse';
import type { ClipResource, GroupPrimitive } from './group';
import type { PaintResource } from './paint';
import type { PathPrimitive } from './path';
import type { RectPrimitive } from './rect';
import type { TextPrimitive } from './text';

/**
 * Scene primitive：渲染目标无关的最大公约子集
 * @description 所有 adapter（SVG/Canvas/PDF/Skia）都应能消费；不允许出现 SVG-only 或 Canvas-only 特性（filter/marker/imageData）
 */
export type ScenePrimitive = RectPrimitive | EllipsePrimitive | TextPrimitive | PathPrimitive | GroupPrimitive;

/**
 * Scene 级渲染无关资源
 * @description 通过 `kind` 区分 paint 与 clip，id 在各资源类型间保持稳定且不冲突
 */
export type SceneResource = PaintResource | ClipResource;

/** 按绘制与裁剪分类的场景资源 */
export type SceneResources = Readonly<{
  /** 供填充和描边引用的渐变、图案及图片 */
  paints: ReadonlyArray<PaintResource>;
  /** 供分组引用的裁剪路径 */
  clips: ReadonlyArray<ClipResource>;
}>;

/** 场景：渲染目标无关的"已布局好的图元集合 + layout" */
export type Scene = {
  /** 已布局好的图元数组，按渲染顺序排列 */
  primitives: Array<ScenePrimitive>;
  /** 整个场景的布局边界 */
  layout: BoundsRect;
  /**
   * 按绘制与裁剪分类的后端中立资源；无资源时省略
   * @default undefined
   */
  resources?: SceneResources;
  /** scene 根（镜头）时间轴动画 tracks（viewBox property）：compile 从 IR 根 animations 原样透传；renderer 能播则播、不能则用静态 layout 并 warn。无则省略 */
  animations?: Array<IRAnimationTrack>;
};
