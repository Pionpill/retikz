import { lazy, number, object, tuple, union } from 'zod';

import {
  AnchorRefSchema,
  BetweenPositionSchema,
  BoundaryAnchorRefSchema,
  NodeTargetSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
} from '../../position';

export { AnchorRefSchema, BoundaryAnchorRefSchema, NodeTargetSchema };

export const RelativeTargetSchema = object({
  relative: tuple([number(), number()]).describe('Relative offset (dx, dy)'),
}).describe('Relative offset from the previous step end point. Does not update the cursor position.');

export const RelativeAccumulateTargetSchema = object({
  relativeAccumulate: tuple([number(), number()]).describe('Accumulated relative offset (dx, dy)'),
}).describe('Accumulated relative offset from the previous step end point. Updates the cursor position.');

export const TargetSchema = union([
  PositionSchema,
  PolarPositionSchema,
  NodeTargetSchema,
  RelativeTargetSchema,
  RelativeAccumulateTargetSchema,
  OffsetPositionSchema,
  // between 经 z.lazy 引用，化解 target.ts ↔ between-position.ts 的模块环（between 端点又引 NodeTarget）
  lazy(() => BetweenPositionSchema),
]).describe(
  'Path endpoint target. Supports Cartesian, polar, node, relative, accumulated-relative, offset, and between-position forms.',
);
