import type { ClipShape, ClipFillRule, IRPosition, PathCommand } from '@retikz/core';
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
export type CircleClipShape = {
  /** 标识圆形裁剪区域 */
  kind: 'circle';
  /** 裁剪参数 */
  params: {
    /** 圆心的用户坐标 x */
    cx: number;
    /** 圆心的用户坐标 y */
    cy: number;
    /** 圆半径，单位为用户坐标单位 */
    r: number;
  };
};

/** 用户坐标系中的椭圆裁剪形状 */
export type EllipseClipShape = {
  /** 标识椭圆裁剪区域 */
  kind: 'ellipse';
  /** 裁剪参数 */
  params: {
    /** 椭圆中心的用户坐标 x */
    cx: number;
    /** 椭圆中心的用户坐标 y */
    cy: number;
    /** 水平半轴长度 */
    rx: number;
    /** 垂直半轴长度 */
    ry: number;
  };
};

/** 用户坐标系中的多边形裁剪形状 */
export type PolygonClipShape = {
  /** 标识多边形裁剪区域 */
  kind: 'polygon';
  /** 裁剪参数 */
  params: {
    /** 按边界顺序排列的用户坐标顶点 */
    points: Array<IRPosition>;
  };
};

/** 使用结构化命令描述的路径裁剪形状 */
export type PathClipShape = {
  /** 标识路径裁剪区域 */
  kind: 'path';
  /** 裁剪参数 */
  params: {
    /** 描述裁剪区域边界的结构化路径命令 */
    commands: Array<PathCommand>;
    /** @default nonzero */
    fillRule?: ClipFillRule;
  };
};

/** 按 authored 顺序累积子形状的复合裁剪形状 */
export type CompoundClipShape = {
  /** 标识复合裁剪区域 */
  kind: 'compound';
  /** 裁剪参数 */
  params: {
    /** 按作者顺序累积的子裁剪形状 */
    children: Array<ClipShape>;
    /** @default nonzero */
    fillRule?: ClipFillRule;
  };
};
