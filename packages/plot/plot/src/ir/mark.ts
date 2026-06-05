import { z } from 'zod';
import type { ValueOf } from '@retikz/core';
import { EncodingSchema } from './encoding';

/**
 * mark 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'point'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotMark.x)（不用 nativeEnum）；后续加 bar / area / sector / rule / text…
 */
export const PlotMark = {
  /** 散点：每行一个 glyph */
  Point: 'point',
  /** 折线：按顺序连点成路径 */
  Line: 'line',
  /** 区间：从 baseline 到 value 的矩形（柱状图 / 甘特） */
  Interval: 'interval',
} as const;

/** mark 类型 */
export type MarkType = ValueOf<typeof PlotMark>;

/**
 * 多系列柱的组合方式关键字（暴露给用户；裸 `'dodge'` / `'stack'` 同样可用）
 * @description relation 字段，决定同类别多系列柱如何摆放：并排 / 累叠
 */
export const PlotArrangement = {
  /** 并排：band 内按系列切等分子带 */
  Dodge: 'dodge',
  /** 累叠：读 stack transform 派生的 y0 / y1 */
  Stack: 'stack',
} as const;

/** 多系列柱组合方式 */
export type ArrangementType = ValueOf<typeof PlotArrangement>;

/** 各 mark 变体共享的基础字段（可选 id 句柄 + 必填 encoding） */
const markBase = {
  id: z
    .string()
    .min(1)
    .optional()
    .describe('Optional mark handle; reserved scope/anchor target (resolution deferred to alpha.5)'),
  encoding: EncodingSchema,
};

export const PointMarkSchema = z
  .object({ type: z.literal(PlotMark.Point).describe('Discriminator: one glyph per record'), ...markBase })
  .describe('Point mark: scatter / dot');

export const LineMarkSchema = z
  .object({
    type: z.literal(PlotMark.Line).describe('Discriminator: ordered points connected by a path'),
    order: z
      .string()
      .min(1)
      .optional()
      .describe('Data field driving connection order; omit for data array order (minimal relation)'),
    series: z
      .string()
      .min(1)
      .optional()
      .describe('Series field: split records into one line per distinct value (multi-series); each series gets its own color via the color scale'),
    ...markBase,
  })
  .describe('Line mark: connects records in order');

export const IntervalMarkSchema = z
  .object({
    type: z.literal(PlotMark.Interval).describe('Discriminator: a rectangular interval from a baseline to the value (bar)'),
    series: z
      .string()
      .min(1)
      .optional()
      .describe('Series field: split records into multiple bar series per distinct value'),
    arrangement: z
      .nativeEnum(PlotArrangement)
      .optional()
      .describe("How multiple series combine within one category: 'dodge' (side-by-side sub-bands; default when series is set) / 'stack' (cumulative, reading the stack-transform y0 / y1)"),
    y0Field: z
      .string()
      .min(1)
      .optional()
      .describe('Lower-bound field for stacked bars (matches the stack transform startField; default "y0"). Only read when arrangement = stack'),
    y1Field: z
      .string()
      .min(1)
      .optional()
      .describe('Upper-bound field for stacked bars (matches the stack transform endField; default "y1"). Only read when arrangement = stack'),
    ...markBase,
  })
  .describe('Interval mark: bar from baseline (0) to the value; width taken from the band scale');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, LineMarkSchema, IntervalMarkSchema])
  .describe('Mark union; extensible to area / sector / rule / text in later alphas');

/** point mark */
export type PointMark = z.infer<typeof PointMarkSchema>;
/** line mark */
export type LineMark = z.infer<typeof LineMarkSchema>;
/** interval(bar) mark */
export type IntervalMark = z.infer<typeof IntervalMarkSchema>;
/** mark（point / line / interval） */
export type Mark = z.infer<typeof MarkSchema>;
