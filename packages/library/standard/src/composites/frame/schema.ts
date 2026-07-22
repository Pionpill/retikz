import { CompositeBaseSchema, NodeSchema } from '@retikz/core';
import { z } from 'zod';

import { StandardPathBorderStyleSchema } from '../shared';

const FrameBorderSchema = StandardPathBorderStyleSchema.extend({
  stroke: StandardPathBorderStyleSchema.shape.stroke.default('currentColor'),
  strokeWidth: StandardPathBorderStyleSchema.shape.strokeWidth.default(1),
}).default({ stroke: 'currentColor', strokeWidth: 1 });

/** Frame 的 JSON-safe Tier 2 composite schema */
export const FrameSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('frame').describe('Composite type for a visually bounded group of Core nodes.'),
  id: z.string().min(1).describe('Stable Scope identity referenced by the border and optional label carrier.'),
  gap: z.number().finite().nonnegative().default(8).describe('Uniform outward border gap in user units.'),
  border: FrameBorderSchema.describe('Style for the lowered border path.'),
  label: z.string().min(1).optional().describe('Optional label placed above the Scope top-left anchor.'),
  children: z.array(NodeSchema).min(1).describe('Non-empty Core Node children that contribute to Scope bounds.'),
});
