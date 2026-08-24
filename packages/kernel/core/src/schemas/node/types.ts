import type { OpenString, ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { BuiltinShapeValue } from '../shape';
import type { NodeTextAlign } from '../text';
import type { NodeLabelPlacement, NodeLabelPosition, NodeLabelRotateMode, NodeTextColor } from './constants';
import type {
  AxisScaleSchema,
  BoxSizeSchema,
  BoxSpacingSchema,
  NodeLabelBoundaryPositionSchema,
  NodeLabelSchema,
  NodeSchema,
} from './schema';

/** CSS-like 四边 spacing 对象，供 Node padding / margin 复用 */
export type IRBoxSpacing = ZodInfer<typeof BoxSpacingSchema>;

/** 轴向缩放对象，供 Node scale 复用 */
export type IRAxisScale = ZodInfer<typeof AxisScaleSchema>;

/** 宽高尺寸对象，供 Node minimumSize 复用 */
export type IRBoxSize = ZodInfer<typeof BoxSizeSchema>;

export type IRNodeLabelBoundaryPosition = ZodInfer<typeof NodeLabelBoundaryPositionSchema>;

/** Node label IR 类型 */
export type IRNodeLabel = ZodInfer<typeof NodeLabelSchema>;

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = ZodInfer<typeof NodeSchema>;

/**
 * 节点形状名：开放字符串
 * @description 内置 `BuiltinShapeValue`，或经 `CompileOptions.shapes` 注册的扩展 shape 名
 */
export type NodeShape = OpenString<BuiltinShapeValue>;

export type NodeTextAlignValue = ValueOf<typeof NodeTextAlign>;

export type NodeTextColorValue = ValueOf<typeof NodeTextColor>;

export type NodeLabelPositionValue = ValueOf<typeof NodeLabelPosition>;

export type NodeLabelPlacementValue = ValueOf<typeof NodeLabelPlacement>;

/** 节点标签自身旋转模式取值 */
export type NodeLabelRotateModeValue = ValueOf<typeof NodeLabelRotateMode>;
