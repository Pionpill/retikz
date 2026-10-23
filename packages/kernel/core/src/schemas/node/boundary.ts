import type { ValueOf } from '@retikz/foundation';
import { createOpenStringSchema } from '@retikz/foundation';
import { union } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { BuiltinShape, ShapeRefSchema } from './shape';

/** 连接面内置关键字：Self 是编译期保留语义，Circle 由内置 boundary provider 解析 */
export const BuiltinBoundary = {
  /** 连接面 = 节点自身视觉形状（默认） */
  Self: 'shape',
  /** 规则圆连接面；具体包围策略由 builtin boundary params.fit 决定 */
  Circle: 'circle',
} as const;

/** 内置规则连接面的拟合策略 */
export const BoundaryFit = {
  /** 使用视觉 shape 提供的安全连接包络 */
  Tight: 'tight',
  /** 使用视觉 shape 的外接 AABB 安全包围 */
  Bounds: 'bounds',
} as const;

/** 连接面内置关键字联合（'shape' | 'circle'） */
export type BuiltinBoundary = ValueOf<typeof BuiltinBoundary>;

/** 内置规则连接面的拟合策略联合 */
export type BoundaryFit = ValueOf<typeof BoundaryFit>;

/** 校验路径端点和方向锚点使用的连接面名称或参数化形状引用 */
export const BoundarySchema = union([
  createOpenStringSchema({ ...BuiltinShape, Self: BuiltinBoundary.Self }),
  ShapeRefSchema,
]).describe(
  'Connection surface for edge endpoints and direction anchors. "shape" uses the visual shape; registered boundary providers override shape fallback.',
);

/** 连接面引用，支持内置名称、自定义 boundary 或 shape 名称，以及带参数的引用 */
export type IRBoundary = ZodInfer<typeof BoundarySchema>;
