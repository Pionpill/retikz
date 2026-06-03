import { z } from 'zod';
import type { ValueOf } from '@retikz/core';

/**
 * scale 类型判别值集（const 对象 + 派生类型；后续加 band / log / time / ordinal…）
 * @description discriminated union 判别字段，成员里写 z.literal(SCALE_TYPES.x)（不用 nativeEnum）
 */
export const SCALE_TYPES = { linear: 'linear' } as const;

/** scale 类型 */
export type ScaleType = ValueOf<typeof SCALE_TYPES>;

export const LinearScaleSchema = z
  .object({
    type: z.literal(SCALE_TYPES.linear).describe('Discriminator: continuous linear scale'),
    name: z.string().min(1).describe('Scale name; referenced by coordinate.x / coordinate.y'),
    domain: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[min, max] input extent; omit to infer from the bound dataset fields at lowering'),
    range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
    nice: z.boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
    clamp: z.boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  })
  .describe('Linear scale: a continuous numeric mapping from domain to range');

export const ScaleSchema = z
  .discriminatedUnion('type', [LinearScaleSchema])
  .describe('Scale union; extensible to band / time / ordinal / color scales in alpha.3 (registry-style)');

/** scale（alpha.1 仅 linear） */
export type Scale = z.infer<typeof ScaleSchema>;
