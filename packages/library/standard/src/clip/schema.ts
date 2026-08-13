import type { IRClipFillRule, IRClipSpec } from '@retikz/core';

import { ClipFillRuleSchema, ClipSpecSchema } from '@retikz/core';
import { z } from 'zod';

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
