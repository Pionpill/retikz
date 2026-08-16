import type { z } from 'zod';

import type { IRClipFillRule, IRJsonObject, IRPosition } from '../../schemas';
import type { PathCommand, SceneClipPath } from '../scene';

/** 可由 ClipShape Definition 降低的开放 JSON 裁剪形状 */
export type ClipShape = IRJsonObject & {
  /** shape registry 判别字段 */
  kind: string;
};

/** 用户坐标系中的矩形裁剪形状 */
export type RectClipShape = IRJsonObject & {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

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

/** ClipShape lowering 的递归上下文 */
export type ClipShapeLowerContext = {
  /** 与当前 compile 共享的 Scene 精度函数 */
  round: (value: number) => number;
  /** 通过当前 shape registry 降低嵌套形状 */
  lower: (shape: ClipShape) => SceneClipPath;
};

/** ClipShape Definition 的作者侧输入 */
export type ClipShapeDefinitionInput<TShape extends ClipShape> = {
  /** shape registry key */
  kind: TShape['kind'];
  /** 完整 shape snapshot 的 Zod schema */
  schema: z.ZodType<TShape>;
  /** 把已校验 shape 降低为渲染无关路径 */
  lower: (shape: TShape, context: ClipShapeLowerContext) => SceneClipPath;
};

/** ClipShape Definition 的公开与 registry 存储形态 */
export type ClipShapeDefinition<TShape extends ClipShape = ClipShape> = ClipShapeDefinitionInput<TShape>;

/** registry 中擦除 shape 泛型后的 ClipShape Definition */
export type AnyClipShapeDefinition = Readonly<{
  /** shape registry key */
  kind: string;
  /** registry 只在运行时执行 parse 的完整 shape schema */
  schema: z.ZodType;
  /** 只在 schema parse 后恢复当前 definition 时调用的擦除 lowering 入口 */
  lower: (shape: never, context: ClipShapeLowerContext) => SceneClipPath;
}>;
