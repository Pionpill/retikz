import { BoxSpacingSchema, CompositeBaseSchema, NodeSchema, RectangleStepSchema } from '@retikz/core';
import { z } from 'zod';

import { StandardPathBorderStyleSchema } from '../shared/schemas';
import { FrameHeaderDirection } from './constants';
import { FrameDescriptionSchema, FrameTitleSchema } from './header-schema';

const FrameBorderStyleSchema = StandardPathBorderStyleSchema.omit({
  color: true,
  opacity: true,
  zIndex: true,
});

const FramePaddingSchema = z.union([z.number().nonnegative(), BoxSpacingSchema]);

const FrameBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('frame').describe('Composite type for a bordered semantic group of Core nodes.'),
  ...FrameBorderStyleSchema.shape,
  id: z.string().min(1).describe('Stable identity for the lowered outer Scope.'),
  padding: FramePaddingSchema.default(8).describe(
    'Border padding around the final body and header bounds. Side fields override axis fields, then default.',
  ),
  gap: z
    .number()
    .nonnegative()
    .default(4)
    .describe('Gap between adjacent header parts and between the header and body.'),
  headerDirection: z
    .enum(FrameHeaderDirection)
    .default(FrameHeaderDirection.Horizontal)
    .describe('Horizontal or vertical arrangement of the optional title and description.'),
  stroke: FrameBorderStyleSchema.shape.stroke.default('currentColor'),
  strokeWidth: FrameBorderStyleSchema.shape.strokeWidth.default(1),
  cornerRadius: RectangleStepSchema.shape.cornerRadius.describe(
    'Uniform corner radius for the rectangular Frame border; omitted keeps sharp corners.',
  ),
  zIndex: NodeSchema.shape.zIndex.describe('Stacking order of the complete lowered Frame Scope.'),
  title: FrameTitleSchema.optional().describe('Optional Node-like primary title arranged above the Frame body.'),
  description: FrameDescriptionSchema.optional().describe(
    'Optional Node-like supporting description arranged above the Frame body.',
  ),
  children: z.array(NodeSchema).min(1).describe('Non-empty direct Core Node body contributing to Frame bounds.'),
});

type FrameRefinementInput = z.infer<typeof FrameBaseSchema>;

const refineReservedIds = (frame: FrameRefinementInput, ctx: z.RefinementCtx): void => {
  const reservedIds = new Set([frame.id, `${frame.id}/content`, `${frame.id}/title`, `${frame.id}/description`]);
  frame.children.forEach((child, index) => {
    if (child.id !== undefined && reservedIds.has(child.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['children', index, 'id'],
        message: `Frame child id '${child.id}' is reserved by Frame '${frame.id}'.`,
      });
    }
  });
  const headers = [
    ['title', frame.title],
    ['description', frame.description],
  ] as const;
  headers.forEach(([key, header]) => {
    if (header?.id !== undefined && reservedIds.has(header.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [key, 'id'],
        message: `Frame ${key} id '${header.id}' is reserved by Frame '${frame.id}'.`,
      });
    }
  });
};

export const FrameSchema = FrameBaseSchema.superRefine(refineReservedIds);
