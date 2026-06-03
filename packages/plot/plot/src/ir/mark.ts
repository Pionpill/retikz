import { z } from 'zod';
import type { ValueOf } from '@retikz/core';
import { EncodingSchema } from './encoding';

/**
 * mark 类型判别值集（const 对象 + 派生类型；后续加 bar / area / sector / rule / text…）
 * @description discriminated union 判别字段，成员里写 z.literal(MARK_TYPES.x)（不用 nativeEnum）
 */
export const MARK_TYPES = { point: 'point', line: 'line' } as const;

/** mark 类型 */
export type MarkType = ValueOf<typeof MARK_TYPES>;

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
  .object({ type: z.literal(MARK_TYPES.point).describe('Discriminator: one glyph per record'), ...markBase })
  .describe('Point mark: scatter / dot');

export const LineMarkSchema = z
  .object({
    type: z.literal(MARK_TYPES.line).describe('Discriminator: ordered points connected by a path'),
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
