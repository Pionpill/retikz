import type { z } from 'zod';

import type { ValueOf } from '../../types';
import type {
  BuiltinShape,
  NodeLabelBoundarySide,
  NodeLabelPlacement,
  NodeLabelPosition,
  NodeTextAlign,
} from './constants';
import type { NodeLabelBoundaryPositionSchema, NodeLabelSchema, NodeSchema } from './schema';

export type IRNodeLabelBoundaryPosition = z.infer<typeof NodeLabelBoundaryPositionSchema>;

/** Node label IR 类型 */
export type IRNodeLabel = z.infer<typeof NodeLabelSchema>;

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;

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
