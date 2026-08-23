import { BoxSpacingSchema, CompositeBaseSchema, NodeSchema, RectangleStepSchema, ScopePropsSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import { StandardPathBorderStyleSchema } from '../shared/schemas';
import { FrameHeaderDirection } from './constants';
const FrameHeaderShape = {
  ...NodeSchema.omit({ type: true, position: true, text: true }).shape,
  text: NodeSchema.shape.text.unwrap().describe('Required Core Node text rendered as Frame header content.'),
};

export const FrameTitleSchema = z
  .strictObject(FrameHeaderShape)
  .describe('Node-like primary title authored without an explicit position.');

export const FrameDescriptionSchema = z
  .strictObject(FrameHeaderShape)
  .describe('Node-like supporting description authored without an explicit position.');

const FramePaddingSchema = z.union([NonNegativeNumberSchema, BoxSpacingSchema]);

export const FrameBorderSchema = z.strictObject({
  style: StandardPathBorderStyleSchema.default({ stroke: 'currentColor', strokeWidth: 1 }),
  cornerRadius: RectangleStepSchema.shape.cornerRadius,
});

const FrameBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('frame').describe('Composite type for a bordered semantic group of Core nodes.'),
  ...ScopePropsSchema.shape,
  id: NonBlankStringSchema.describe('Stable identity for the lowered outer Scope.'),
  localNamespace: ScopePropsSchema.shape.localNamespace.default(false),
  boundingShape: ScopePropsSchema.shape.boundingShape.default('rectangle'),
  border: FrameBorderSchema.default({ style: { stroke: 'currentColor', strokeWidth: 1 } }).describe(
    'Border Path style and corner radius, separate from the root Scope cascade.',
  ),
  padding: FramePaddingSchema.default(8).describe(
    'Border padding around the final body and header bounds. Side fields override axis fields, then default.',
  ),
  gap: NonNegativeNumberSchema.default(4).describe(
    'Gap between adjacent header parts and between the header and body.',
  ),
  headerDirection: z
    .enum(FrameHeaderDirection)
    .default(FrameHeaderDirection.Horizontal)
    .describe('Horizontal or vertical arrangement of the optional title and description.'),
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
