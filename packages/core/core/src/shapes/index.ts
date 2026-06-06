/**
 * Shape Registry 扩展面
 * @description 内置 shape 的注册项 + 第三方 shape 作者所需的类型 / helper。
 *   `circle` / `diamond` 不在注册表——均无独立几何，由 `normalizeShape` 在编译期消解为 preset：
 *   circle → ellipse 等轴（`{ type: 'ellipse', params: { circumscribe: 'equal' } }`）、
 *   diamond → polygon 4 边形 45°（`{ type: 'polygon', params: { sides: 4, rotate: 45 } }`）；
 *   registry key 类型据此把 `'circle'` / `'diamond'` 排除。
 */
import type { BuiltinShapeName } from '../ir/node';
import { arc } from './arc';
import { defineShape } from './define';
import { ellipse } from './ellipse';
import { polygon } from './polygon';
import { rectangle } from './rectangle';
import { sector } from './sector';
import { star } from './star';
import type { ShapeDefinition } from './types';

/** 内置 shape 注册项（circle / diamond 已收为 preset，不占独立项）；与 `CompileOptions.shapes` 合并时被同名注入覆盖 */
export const BUILTIN_SHAPES: Record<Exclude<BuiltinShapeName, 'circle' | 'diamond'> | 'sector' | 'arc' | 'polygon' | 'star', ShapeDefinition> = {
  rectangle,
  ellipse,
  sector,
  arc,
  polygon,
  star,
};

export { rectangle, ellipse, polygon, sector, arc, star, defineShape };
export type { ShapeDefinition, ShapeDefinitionInput, ShapeStyle } from './types';
// 第三方 shape 作者所需 helper / 类型（提升为公开 API）
export type { Rect } from '../geometry/rect';
export type { Position } from '../geometry/point';
export { worldToLocal, localToWorld } from '../geometry/_transform';
