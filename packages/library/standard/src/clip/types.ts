import type { ClipShape, IRClipFillRule, IRJsonObject, IRPosition, PathCommand } from '@retikz/core';
import type { infer as ZodInfer } from 'zod';

import type {
  CircleClipSchema,
  CompoundClipSchema,
  EllipseClipSchema,
  PathClipSchema,
  PolygonClipSchema,
} from './schema';

export type IRCircleClip = ZodInfer<typeof CircleClipSchema>;

export type IREllipseClip = ZodInfer<typeof EllipseClipSchema>;

export type IRPolygonClip = ZodInfer<typeof PolygonClipSchema>;

export type IRPathClip = ZodInfer<typeof PathClipSchema>;

export type IRCompoundClip = ZodInfer<typeof CompoundClipSchema>;

/** 用户坐标系中的圆形裁剪形状 */
export type CircleClipShape = IRJsonObject & {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
};

/** 用户坐标系中的椭圆裁剪形状 */
export type EllipseClipShape = IRJsonObject & {
  kind: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

/** 用户坐标系中的多边形裁剪形状 */
export type PolygonClipShape = IRJsonObject & {
  kind: 'polygon';
  points: Array<IRPosition>;
};

/** 使用结构化命令描述的路径裁剪形状 */
export type PathClipShape = IRJsonObject & {
  kind: 'path';
  commands: Array<PathCommand>;
  /** @default nonzero */
  fillRule?: IRClipFillRule;
};

/** 按 authored 顺序累积子形状的复合裁剪形状 */
export type CompoundClipShape = IRJsonObject & {
  kind: 'compound';
  children: Array<ClipShape>;
  /** @default nonzero */
  fillRule?: IRClipFillRule;
};
