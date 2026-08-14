import type { IRClipFillRule, IRClipSpec } from '@retikz/core';

import { ClipFillRuleSchema, ClipSpecSchema, PathCommandSchema } from '@retikz/core';
import { z } from 'zod';

/** Standard 提供的多边形裁切规格 */
export const PolygonClipSchema = z
  .strictObject({
    kind: z.literal('polygon').describe('Discriminator for polygon clip regions.'),
    points: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .describe('Polygon vertices as [x, y] tuples.'),
  })
  .describe('Polygon clip region.');

/** Standard 提供的路径裁切规格 */
export const PathClipSchema = z
  .strictObject({
    kind: z.literal('path').describe('Discriminator for path clip regions.'),
    commands: z.array(PathCommandSchema).min(1).describe('Structured path commands for the clip region.'),
    fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the path clip.'),
  })
  .describe('Path clip region.');

/** Standard clip 的多边形 IR 类型 */
export type StandardPolygonClipSpec = z.infer<typeof PolygonClipSchema>;

/** Standard clip 的路径 IR 类型 */
export type StandardPathClipSpec = z.infer<typeof PathClipSchema>;

/** Compound Clip 的递归 JSON 安全规格 */
export type CompoundClipSpec = {
  kind: 'compound';
  children: Array<IRClipSpec | CompoundClipSpec>;
  fillRule?: IRClipFillRule;
};

/** Standard 提供的递归 Compound Clip schema */
export const CompoundClipSchema: z.ZodType<CompoundClipSpec> = z.lazy(() =>
  z
    .strictObject({
      kind: z.literal('compound').describe('Discriminator for compound clip regions.'),
      children: z
        .array(z.union([CompoundClipSchema, ClipSpecSchema]))
        .min(1)
        .describe('Child clip regions resolved through the active Core clip registry.'),
      fillRule: ClipFillRuleSchema.optional().describe('Fill rule for the accumulated compound clip path.'),
    })
    .describe('Compound clip region.'),
);
