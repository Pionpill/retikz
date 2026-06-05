/**
 * Shape Registry 扩展面
 * @description 内置 shape 的注册项 + 第三方 shape 作者所需的类型 / helper。
 *   `circle` 不在注册表——它无独立几何，由 `normalizeShape` 在编译期消解为 ellipse 等轴 preset
 *   （`{ type: 'ellipse', params: { circumscribe: 'equal' } }`）；registry key 类型据此把 `'circle'` 排除。
 */
import type { BuiltinShapeName } from '../ir/node';
import { arc } from './arc';
import { defineShape } from './define';
import { diamond } from './diamond';
import { ellipse } from './ellipse';
import { rectangle } from './rectangle';
import { sector } from './sector';
import type { ShapeDefinition } from './types';

/** 内置 shape 注册项（circle 已收为 ellipse preset，不占独立项）；与 `CompileOptions.shapes` 合并时被同名注入覆盖 */
export const BUILTIN_SHAPES: Record<Exclude<BuiltinShapeName, 'circle'> | 'sector' | 'arc', ShapeDefinition> = {
  rectangle,
  ellipse,
  diamond,
  sector,
  arc,
};

export { rectangle, ellipse, diamond, sector, arc, defineShape };
export type { ShapeDefinition, ShapeDefinitionInput, ShapeStyle } from './types';
// 第三方 shape 作者所需 helper / 类型（提升为公开 API）
export type { Rect } from '../geometry/rect';
export type { Position } from '../geometry/point';
export { worldToLocal, localToWorld } from '../geometry/_transform';
