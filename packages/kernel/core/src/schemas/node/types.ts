import type { z } from 'zod';
import type { NodeLabelBoundaryPositionSchema, NodeLabelSchema, NodeSchema } from './schema';

export type IRNodeLabelBoundaryPosition = z.infer<typeof NodeLabelBoundaryPositionSchema>;

/** Node label IR 类型 */
export type IRNodeLabel = z.infer<typeof NodeLabelSchema>;

/** 节点：可定位的形状容器（矩形/圆/椭圆/菱形）+ 可选文本标签 */
export type IRNode = z.infer<typeof NodeSchema>;
