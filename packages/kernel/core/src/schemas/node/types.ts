import type { z } from 'zod';

import type { WebSideInput } from '../../shared';
import type { ValueOf } from '../../shared';
import type { AtDirectionInput } from '../position';
import type {
  BuiltinShape,
  NodeLabelPlacement,
  NodeLabelPosition,
  NodeLabelRotateMode,
  NodeTextAlign,
} from './constants';
import type { NodeLabelBoundaryPositionSchema, NodeLabelSchema, NodeSchema } from './schema';

export type IRNodeLabelBoundaryPosition = z.infer<typeof NodeLabelBoundaryPositionSchema>;

export type IRNodeLabelBoundaryPositionInput = Omit<IRNodeLabelBoundaryPosition, 'boundary'> & {
  boundary: WebSideInput;
};

/** Node label IR 类型 */
export type IRNodeLabel = z.infer<typeof NodeLabelSchema>;

export type NodeLabelPositionInput =
  | AtDirectionInput
  | typeof NodeLabelPosition.Center
  | number
  | IRNodeLabelBoundaryPositionInput;

export type IRNodeLabelInput = Omit<IRNodeLabel, 'position'> & {
  position?: NodeLabelPositionInput;
};

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;

/**
 * 内置 4 shape 名联合
 * @description `BUILTIN_SHAPES` 的 Record key（保穷尽性约束，不随 `NodeShape` 开放而退化为 `string`）
 */
export type BuiltinShapeValue = ValueOf<typeof BuiltinShape>;

/**
 * 节点形状名：开放字符串
 * @description 内置 `BuiltinShapeValue`，或经 `CompileOptions.shapes` 注册的扩展 shape 名；
 *   `& {}` 让 IDE 仍对内置 4 名自动补全，同时接受任意非空字符串
 */
export type NodeShape = BuiltinShapeValue | (string & {});

export type NodeTextAlignValue = ValueOf<typeof NodeTextAlign>;

export type NodeLabelPositionValue = ValueOf<typeof NodeLabelPosition>;

export type NodeLabelPlacementValue = ValueOf<typeof NodeLabelPlacement>;

/** 节点标签自身旋转模式取值 */
export type NodeLabelRotateModeValue = ValueOf<typeof NodeLabelRotateMode>;
