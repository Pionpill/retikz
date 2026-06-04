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
} as const;

/** mark 类型 */
export type MarkType = ValueOf<typeof PlotMark>;

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
    ...markBase,
  })
  .describe('Line mark: connects records in order');

export const MarkSchema = z
  .discriminatedUnion('type', [PointMarkSchema, LineMarkSchema])
  .describe('Mark union; extensible to interval(bar) / area / sector / rule / text in later alphas');

/** mark（alpha.1 仅 point / line） */
export type Mark = z.infer<typeof MarkSchema>;
