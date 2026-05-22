/**
 * Shape Registry 扩展面
 * @description 内置 4 shape 的注册项 + 第三方 shape 作者所需的类型 / helper。
 *   `BUILTIN_SHAPES` 的 Record key 用 `BuiltinShapeName`（4 名穷尽），不用开放的 `NodeShape`。
 */
import type { BuiltinShapeName } from '../ir/node';
import { circle } from './circle';
import { diamond } from './diamond';
import { ellipse } from './ellipse';
import { rectangle } from './rectangle';
import type { ShapeDefinition } from './types';

/** 内置 4 shape 注册项；与 `CompileOptions.shapes` 合并时被同名注入覆盖 */
export const BUILTIN_SHAPES: Record<BuiltinShapeName, ShapeDefinition> = {
  rectangle,
  circle,
  ellipse,
  diamond,
};

export { rectangle, circle, ellipse, diamond };
export type { ShapeDefinition, ShapeStyle } from './types';
// 第三方 shape 作者所需 helper / 类型（提升为公开 API）
export type { Rect } from '../geometry/rect';
export type { Position } from '../geometry/point';
export { worldToLocal, localToWorld } from '../geometry/_transform';
