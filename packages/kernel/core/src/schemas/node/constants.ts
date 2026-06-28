import type { ValueOf } from '../../types';
import { AtDirection } from '../position';

/**
 * 节点形状常量（用 const + ValueOf 派生，不用 TS enum）
 * @description rectangle 默认；几何语义：node 视觉边界包"text 矩形 + padding"；rectangle: 视觉=text；ellipse: rx=innerHalfW×√2,ry=innerHalfH×√2。circle 是 ellipse 等轴 preset 别名（`{ type:'ellipse', params:{ circumscribe:'equal' } }`，两轴 = 内框对角线半长 √(innerHalfW²+innerHalfH²)）；diamond 是 polygon 4 边形 preset 别名（`{ type:'polygon', params:{ sides:4, rotate:0 } }`）——circle / diamond 均保留为合法 shape 名向后兼容，编译期分别消解为 ellipse / polygon，不进 shape 注册表
 */
export const BuiltinShape = {
  Rectangle: 'rectangle',
  Circle: 'circle',
  Ellipse: 'ellipse',
  Diamond: 'diamond',
} as const;

/** 节点文本对齐（TikZ `align=` 同义） */
export const NodeTextAlign = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
} as const;

export const NodeLabelPosition = {
  ...AtDirection,
  Center: 'center',
} as const;

export const NodeLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

export const NodeLabelBoundarySide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;

/**
 * 内置 4 shape 名联合
 * @description `BUILTIN_SHAPES` 的 Record key（保穷尽性约束，不随 `NodeShape` 开放而退化为 `string`）
 */
export type BuiltinShapeValue = ValueOf<typeof BuiltinShape>;

export type BuiltinShapeName = BuiltinShapeValue;

/**
 * 节点形状名：开放字符串
 * @description 内置 `BuiltinShapeName`，或经 `CompileOptions.shapes` 注册的扩展 shape 名；
 *   `& {}` 让 IDE 仍对内置 4 名自动补全，同时接受任意非空字符串
 */
export type NodeShape = BuiltinShapeName | (string & {});

export type NodeTextAlignValue = ValueOf<typeof NodeTextAlign>;

export type NodeLabelPositionValue = ValueOf<typeof NodeLabelPosition>;

export type NodeLabelPlacementValue = ValueOf<typeof NodeLabelPlacement>;

export type NodeLabelBoundarySideValue = ValueOf<typeof NodeLabelBoundarySide>;
