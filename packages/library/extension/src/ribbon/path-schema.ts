import { PathBaseSchema } from '@retikz/core';
import { literal, never, union } from 'zod';

import { BoundaryRibbonPathOptionsSchema, CenterlineRibbonPathOptionsSchema } from './schema';

/** Extension Ribbon 完整 Path，按构造模式约束中心线 children */
export const RibbonPathSchema = union([
  PathBaseSchema.extend({
    kind: literal('ribbon'),
    kindOptions: CenterlineRibbonPathOptionsSchema,
    children: PathBaseSchema.shape.children.unwrap(),
  }),
  PathBaseSchema.extend({
    kind: literal('ribbon'),
    kindOptions: BoundaryRibbonPathOptionsSchema,
    children: never().optional(),
  }),
]).describe('Complete ribbon subject: centerline requires children; boundary forbids children.');
