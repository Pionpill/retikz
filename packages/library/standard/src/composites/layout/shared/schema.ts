import { BoxSpacingSchema, ChildSchema } from '@retikz/core';
import { z } from 'zod';

import { LayoutAlignment, LayoutAxisSizeKind, LayoutDistribution, LayoutItemKind, LayoutOverflow } from './constants';

const LayoutContentAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Content).describe('Discriminator for intrinsic content sizing.'),
  min: z.number().nonnegative().optional().describe('Optional authored minimum allocation size.'),
  max: z.number().nonnegative().optional().describe('Optional authored maximum allocation size.'),
});

const LayoutFixedAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Fixed).describe('Discriminator for fixed allocation sizing.'),
  value: z.number().nonnegative().describe('Authored fixed allocation size.'),
});

const LayoutFillAxisSizeSchema = z.strictObject({
  kind: z.literal(LayoutAxisSizeKind.Fill).describe('Discriminator for filling finite parent allocation.'),
  min: z.number().nonnegative().optional().describe('Optional authored minimum allocation size.'),
  max: z.number().nonnegative().optional().describe('Optional authored maximum allocation size.'),
});

export const LayoutAxisSizeSchema = z
  .discriminatedUnion('kind', [LayoutContentAxisSizeSchema, LayoutFixedAxisSizeSchema, LayoutFillAxisSizeSchema])
  .superRefine((value, context) => {
    if ('min' in value && value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'max must be greater than or equal to min.',
      });
    }
  })
  .describe('Physical-axis allocation size policy for a Standard layout container.');

const ContentAxisSizeDefault = Object.freeze({ kind: LayoutAxisSizeKind.Content });

export const LayoutSizeSchema = z
  .strictObject({
    x: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Horizontal allocation size policy.'),
    y: LayoutAxisSizeSchema.default(ContentAxisSizeDefault).describe('Vertical allocation size policy.'),
  })
  .default({ x: ContentAxisSizeDefault, y: ContentAxisSizeDefault })
  .describe('Physical x and y allocation size policies.');

const LayoutSpacingSchema = z
  .union([z.number().nonnegative(), BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative box spacing.');

export const LayoutOverflowSchema = z
  .enum(LayoutOverflow)
  .describe('Whether visual overflow remains visible or is clipped to the container allocation.');

export const LayoutContainerBoxSchema = z
  .strictObject({
    size: LayoutSizeSchema.describe('Container allocation size including padding.'),
    padding: LayoutSpacingSchema.default(0).describe('Insets from allocation box to content box.'),
    overflow: LayoutOverflowSchema.default(LayoutOverflow.Visible).describe('Container visual overflow policy.'),
  })
  .describe('Shared Box contract for Standard layout containers.');

export const LayoutAlignmentSchema = z
  .enum(LayoutAlignment)
  .describe('Item alignment including optional baseline-aware variants.');

export const LayoutEdgeAlignmentSchema = z
  .enum([LayoutAlignment.Start, LayoutAlignment.Center, LayoutAlignment.End, LayoutAlignment.Stretch])
  .describe('Edge alignment without baseline variants.');

export const LayoutDistributionSchema = z
  .enum(LayoutDistribution)
  .describe('Distribution of positive or negative free space along one physical axis.');

export const LayoutItemBaseSchema = z
  .strictObject({
    kind: z.enum(LayoutItemKind).describe('Discriminator selecting the owning Standard layout container.'),
    key: z.string().min(1).describe('Container-local stable authored item identity.'),
    child: ChildSchema.describe('JSON-safe Core child laid out by the container.'),
    margin: LayoutSpacingSchema.default(0).describe('Item margin outside the parent allocation slot.'),
  })
  .describe('Shared JSON-safe child item contract for Standard layouts.');
