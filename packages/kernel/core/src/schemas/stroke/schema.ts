import { z } from 'zod';

import { PathLineCap, PathLineJoin } from './constants';

export const StrokeDashPatternSchema = z
  .array(z.number().nonnegative())
  .min(1)
  .describe('Stroke dash pattern lengths in user units.');

export const StrokeDashOffsetSchema = z
  .number()
  .describe('Stroke dash offset in user units. Positive and negative finite values are allowed.');

export const PathLineCapSchema = z.enum(PathLineCap).describe('Path stroke endpoint cap keyword.');

export const PathLineJoinSchema = z.enum(PathLineJoin).describe('Path stroke corner join keyword.');
