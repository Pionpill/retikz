import { CssColorSchema } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { discriminatedUnion, enum as zodEnum, literal, number, strictObject } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { CoordinateConnection, PolarInterpolation } from '../coordinate';
import { ChannelSchema, NodeEncodingSchema, Position2DEncodingSchema, PositionInputSchema } from '../encoding';
import { AnchorIdSchema, hasValidAnchorSource } from './anchor';
import { BuiltinPlotMark, markBase } from './base';
import { nodeHostLabel } from './label';
import {
  MarkOpacityStyleSchema,
  MarkFillStyleSchema,
  MarkNonnegativeNumberStyleSchema,
  MarkStrokeStyleSchema,
  nodeStyleFields,
} from './style';

/**
 * interval 单维区间来源关键字（暴露给用户；裸 `'band'` 等同样可用）
 * @description interval 各位置 role 的区间 [lo,hi] 怎么来：band（band 宽）/ span（baseline→值）/ extent（两字段区间）/ full（满域）
 */
export const IntervalBoundKind = {
  /** 中心取位置通道、宽取 band scale bandwidth；可选 group 字段把 band 切等分子带（分组柱 / dodge） */
  Band: 'band',
  /** baseline（默认 0）→ 位置通道值；经典柱高 / 径向柱 */
  Span: 'span',
  /** 两字段显式区间：histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end */
  Extent: 'extent',
  /** 按数值字段累加出的连续比例区间：variable-width bar / mosaic */
  Proportional: 'proportional',
  /** 满铺该 role 的坐标域（极坐标 inner→outer 半径；饼 / 环半径方向） */
  Full: 'full',
} as const;

/** interval 单维区间来源 */
export type IntervalBoundKind = ValueOf<typeof IntervalBoundKind>;

const BandBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Band).describe(
    'Band bound: center from the role position channel, width from the band scale bandwidth',
  ),
}).describe(
  'Band bound: a category band on this role (bar primary, heatmap axis, polar angle band); optional group → dodge sub-bands',
);

const SpanBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Span).describe('Span bound: from a baseline to the role position channel value'),
  baseline: number()
    .optional()
    .describe('Baseline the span starts from; the interval runs baseline→channel value. Default 0'),
}).describe('Span bound: baseline→value interval (bar height, radial-bar radius)');

const ExtentBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Extent).describe('Extent bound: an explicit interval read from two fields'),
}).describe('Extent bound: explicit [from, to] field interval (histogram bin / stacked bar / cumulative pie angle)');

const ProportionalBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Proportional).describe(
    'Proportional bound: contiguous intervals whose widths are driven by a numeric field',
  ),
}).describe('Proportional bound: contiguous variable-width intervals along this role (variable-width bar / mosaic)');

const FullBoundSchema = strictObject({
  kind: literal(IntervalBoundKind.Full).describe('Full bound: span the whole coordinate domain of this role'),
}).describe('Full bound: spans the role coordinate domain (pie / donut radius, inner→outer)');

/** 校验单个位置角色的带宽、跨度、显式边界、比例或全范围区间来源 */
export const IntervalBoundSchema = discriminatedUnion('kind', [
  BandBoundSchema,
  SpanBoundSchema,
  ExtentBoundSchema,
  ProportionalBoundSchema,
  FullBoundSchema,
]).describe('Single-role interval bound source: band / span / extent / proportional / full');

/** 校验二维区间构造模式，未声明模式由对应尺度推导 */
export const IntervalBoundsSchema = strictObject({
  x: IntervalBoundSchema.optional(),
  y: IntervalBoundSchema.optional(),
}).describe('Interval construction for x/y; omitted modes are inferred from role scales');

/** 校验由各角色区间与坐标系共同确定几何的区间标记 */
export const IntervalPropertiesSchema = strictObject({
  connection: zodEnum(CoordinateConnection).default(CoordinateConnection.Coordinate).optional(),
  color: CssColorSchema.optional(),
  bounds: IntervalBoundsSchema.optional().describe(
    'Per-role interval bounds keyed by coordinate role; omit to infer from the coordinate role',
  ),
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe('Polar2D cell-boundary override; omit to inherit the resolved coordinate interpolation'),
  strokeWidth: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Interval cell stroke width: fixed core Node stroke width',
  ),
  fill: MarkFillStyleSchema.optional().describe('Interval cell fill paint: fixed CSS color / IRPaint'),
  stroke: MarkStrokeStyleSchema.optional().describe('Interval cell stroke paint: fixed CSS color / IRPaint'),
  opacity: MarkOpacityStyleSchema.optional(),
  padAngle: NonNegativeNumberSchema.optional().describe(
    'Angular gap in degrees applied to polar cells; each cell shrinks by half this angle on both sides before sector or chord-contour projection. Cartesian cells ignore it',
  ),
  pull: MarkNonnegativeNumberStyleSchema.optional().describe(
    'Static radial offset in user units for polar cells; moves the local projection center along the final mid angle before sector or chord-contour projection',
  ),
  anchorId: AnchorIdSchema.optional().describe(
    'Stable id rule written to each generated core interval Node; takes precedence over datumIdField for the node id',
  ),
  ...nodeStyleFields,
  ...nodeHostLabel,
}).describe('Fixed interval construction rules and appearance');

/** 校验区间角色的字段来源 */
export const IntervalBoundEncodingSchema = strictObject({
  group: NonBlankStringSchema.optional(),
  from: PositionInputSchema.optional(),
  to: PositionInputSchema.optional(),
  weight: NonBlankStringSchema.optional(),
});

/** 校验数据区间的位置、分组与边界编码 */
export const IntervalMarkEncodingSchema = NodeEncodingSchema.extend({
  anchorId: NonBlankStringSchema.optional(),
  position: Position2DEncodingSchema.omit({ z: true }).partial().optional(),
  series: NonBlankStringSchema.optional(),
  bounds: strictObject({
    x: IntervalBoundEncodingSchema.optional(),
    y: IntervalBoundEncodingSchema.optional(),
  }).optional(),
  pull: ChannelSchema.optional(),
});

/** 校验按坐标角色区间生成的数据图元 */
export const IntervalMarkSchema = strictObject({
  ...markBase,
  type: literal(BuiltinPlotMark.Interval),
  encodings: IntervalMarkEncodingSchema.optional(),
  properties: IntervalPropertiesSchema.optional(),
})
  .refine(hasValidAnchorSource, {
    path: ['properties', 'anchorId'],
    message: 'anchorId requires exactly one of field, template, or generator',
  })
  .describe('Data interval mark');

/** interval 单维区间来源 */
export type IRPlotIntervalBound = ZodInfer<typeof IntervalBoundSchema>;

/** interval per-role 区间来源 */
export type IRPlotIntervalBounds = ZodInfer<typeof IntervalBoundsSchema>;

/** interval mark（柱 / histogram / heatmap / 径向柱 / 饼环） */
export type IRPlotIntervalMark = ZodInfer<typeof IntervalMarkSchema>;
