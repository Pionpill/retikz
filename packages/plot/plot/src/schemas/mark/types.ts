import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';
import type { MarkValueKind } from './constants';
import { BUILTIN_MARK_TYPES } from './constants';
import type { CustomMarkSchema, IntervalBoundSchema, IntervalBoundsSchema, IntervalMarkSchema, LinkEndpointSchema, LinkMarkSchema, MarkOperationSchema, MarkSchema, PathMarkSchema, PointColorStyleSchema, PointFillStyleSchema, PointMarkSchema, PointNonnegativeNumberStyleSchema, PointNumberStyleSchema, PointOpacityStyleSchema, PointShapeStyleSchema, PointSizeStyleSchema, PointStrokeStyleSchema, PointZIndexStyleSchema, ReferenceMarkSchema, RegionMarkSchema } from './schema';

/** point mark（散点 + 文本标签） */
export type PointMark = z.infer<typeof PointMarkSchema>;
/** mark 值来源变体 */
export type MarkValueKindValue = ValueOf<typeof MarkValueKind>;
/** mark 样式值；需要 scale 的属性在此基础上交叉 `{ scale?: string }` */
export type MarkValueType<T> = { kind: 'field'; value: string } | { kind: 'constant'; value: T };
/** mark 样式值，字段变体可绑定 scale */
export type ScaledMarkValueType<T> = MarkValueType<T> & { scale?: string };
/** PointMark 颜色样式值（field / constant） */
export type PointColorStyle = z.infer<typeof PointColorStyleSchema>;
/** PointMark 尺寸样式值（field / constant） */
export type PointSizeStyle = z.infer<typeof PointSizeStyleSchema>;
/** PointMark 形状样式值（field / constant） */
export type PointShapeStyle = z.infer<typeof PointShapeStyleSchema>;
/** PointMark 填充样式值（field / constant） */
export type PointFillStyle = z.infer<typeof PointFillStyleSchema>;
/** PointMark 描边颜色样式值（field / constant） */
export type PointStrokeStyle = z.infer<typeof PointStrokeStyleSchema>;
/** PointMark 描边宽度样式值（field / constant） */
export type PointStrokeWidthStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;
/** PointMark 数值样式值（field / constant） */
export type PointNumberStyle = z.infer<typeof PointNumberStyleSchema>;
/** PointMark 非负数值样式值（field / constant） */
export type PointNonnegativeNumberStyle = z.infer<typeof PointNonnegativeNumberStyleSchema>;
/** PointMark 透明度样式值（field / constant） */
export type PointOpacityStyle = z.infer<typeof PointOpacityStyleSchema>;
/** PointMark zIndex 样式值（field / constant） */
export type PointZIndexStyle = z.infer<typeof PointZIndexStyleSchema>;
/** path mark（折线 / 轮廓） */
export type PathMark = z.infer<typeof PathMarkSchema>;
/** region mark（面积 / 填充雷达） */
export type RegionMark = z.infer<typeof RegionMarkSchema>;
/** interval 单维区间来源 */
export type IntervalBound = z.infer<typeof IntervalBoundSchema>;
/** interval per-role 区间来源 */
export type IntervalBounds = z.infer<typeof IntervalBoundsSchema>;
/** interval mark（柱 / histogram / heatmap / 径向柱 / 饼环） */
export type IntervalMark = z.infer<typeof IntervalMarkSchema>;
/** reference mark（参考线 / 阈值线 / 容差带） */
export type ReferenceMark = z.infer<typeof ReferenceMarkSchema>;
/** link 一端：字段对端点（经坐标系投影成屏幕点） */
export type LinkEndpoint = z.infer<typeof LinkEndpointSchema>;
/** link mark（sankey / alluvial 流带） */
export type LinkMark = z.infer<typeof LinkMarkSchema>;
/** mark（point / path / region / interval / reference / link） */
export type Mark = z.infer<typeof MarkSchema>;
/** custom mark operation（自定义 type passthrough，由 runtime MarkDefinition 解释） */
export type CustomMark = z.infer<typeof CustomMarkSchema>;
/** mark operation（内置 ∪ 自定义 type passthrough） */
export type MarkOperation = z.infer<typeof MarkOperationSchema>;

/** mark operation 是否内置；把放宽后的 union 收窄回精确内置 Mark，供 lowering 内置专属几何分支门控。 */
export const isBuiltinMark = (mark: MarkOperation): mark is Mark => BUILTIN_MARK_TYPES.has(mark.type);
