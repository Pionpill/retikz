import { PathSchema } from '@retikz/core';
import { literal, never, union } from 'zod';

import { BoundaryRibbonPathOptionsSchema, CenterlineRibbonPathOptionsSchema } from './schema';

/** Extension Ribbon 完整 Path，按构造模式约束中心线 children */
export const RibbonPathSchema = union([
  PathSchema.extend({
    kind: literal('ribbon'),
    label: never().optional(),
    kindOptions: CenterlineRibbonPathOptionsSchema,
    children: PathSchema.shape.children.unwrap(),
  }),
  PathSchema.extend({
    kind: literal('ribbon'),
    label: never().optional(),
    kindOptions: BoundaryRibbonPathOptionsSchema,
    children: never().optional(),
  }),
]).describe('Complete ribbon subject: centerline requires children; boundary forbids children.');
