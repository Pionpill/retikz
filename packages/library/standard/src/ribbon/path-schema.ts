import { PathBaseSchema } from '@retikz/core';
import { literal } from 'zod';

import { RibbonPathOptionsSchema } from './schema';

/** Standard Ribbon kind 的完整 Path options schema */
export const RibbonPathSchema = PathBaseSchema.extend({
  kind: literal('ribbon'),
  kindOptions: RibbonPathOptionsSchema,
})
  .superRefine((path, ctx) => {
    if (path.kindOptions.mode === 'boundary') {
      if (path.children !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['children'],
          message: 'Boundary ribbon paths use kindOptions.upper and kindOptions.lower, not top-level children.',
        });
      }
      return;
    }
    if (path.children === undefined) {
      ctx.addIssue({ code: 'custom', path: ['children'], message: 'Centerline ribbon paths require children.' });
    }
  })
  .describe('Complete source subject schema for the Standard ribbon path kind.');
