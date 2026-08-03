import { CompositeBaseSchema } from '@retikz/core';
import { z } from 'zod';

import {
  LayoutAlignment,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutDistributionSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
} from '../shared';
import { FlexLayoutDirection, FlexLayoutWrap } from './constants';

const FLEX_LAYOUT_CONTENT_BASIS = 'content' as const;

export const FlexMainDistributionSchema = z
  .enum([
    LayoutDistribution.Start,
    LayoutDistribution.Center,
    LayoutDistribution.End,
    LayoutDistribution.SpaceBetween,
    LayoutDistribution.SpaceAround,
    LayoutDistribution.SpaceEvenly,
  ])
  .describe('Distribution of remaining main-axis space between flex items.');

export const FlexLayoutItemSchema = LayoutItemBaseSchema.extend({
  kind: z.literal(LayoutItemKind.Flex).describe('Discriminator for a FlexLayout item.'),
  basis: z
    .union([z.literal(FLEX_LAYOUT_CONTENT_BASIS), z.number().nonnegative()])
    .default(FLEX_LAYOUT_CONTENT_BASIS)
    .describe('Natural content contribution or authored main-axis base slot.'),
  grow: z.number().nonnegative().default(0).describe('Non-negative factor for receiving positive free space.'),
  shrink: z.number().nonnegative().default(1).describe('Non-negative factor applied to the base slot for shrink.'),
  min: z.number().nonnegative().optional().describe('Optional authored hard minimum main-axis slot.'),
  max: z.number().nonnegative().optional().describe('Optional authored hard maximum main-axis slot.'),
  alignSelf: z
    .enum(LayoutAlignment)
    .optional()
    .describe('Optional cross-axis alignment overriding the container alignment.'),
})
  .superRefine((item, context) => {
    if (item.min !== undefined && item.max !== undefined && item.min > item.max) {
      context.addIssue({
        code: 'custom',
        path: ['max'],
        message: 'max must be greater than or equal to min.',
      });
    }
  })
  .describe('Canonical JSON-safe item owned by FlexLayout.');

const FlexLayoutBaseSchema = CompositeBaseSchema.extend({
  namespace: z.literal('standard').describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('flexLayout').describe('Composite type for deterministic one-dimensional box layout.'),
  ...LayoutContainerBoxSchema.shape,
  direction: z.enum(FlexLayoutDirection).default(FlexLayoutDirection.Row).describe('Physical main-axis direction.'),
  wrap: z.enum(FlexLayoutWrap).default(FlexLayoutWrap.NoWrap).describe('Line wrapping and cross traversal policy.'),
  columnGap: z.number().nonnegative().default(0).describe('Physical horizontal gap between items or lines.'),
  rowGap: z.number().nonnegative().default(0).describe('Physical vertical gap between items or lines.'),
  justifyContent: FlexMainDistributionSchema.default(LayoutDistribution.Start).describe(
    'Distribution of remaining main-axis space within each line.',
  ),
  alignItems: z
    .enum(LayoutAlignment)
    .default(LayoutAlignment.Stretch)
    .describe('Default cross-axis alignment for flex items.'),
  alignContent: LayoutDistributionSchema.default(LayoutDistribution.Start).describe(
    'Distribution of remaining cross-axis space between wrapped lines.',
  ),
  children: z.array(FlexLayoutItemSchema).default([]).describe('Authored flex items in stable paint order.'),
});

type FlexLayoutRefinementInput = z.infer<typeof FlexLayoutBaseSchema>;

/** 校验 FlexLayout 跨字段方向、baseline 与本地 key 契约 */
const refineFlexLayout = (layout: FlexLayoutRefinementInput, context: z.RefinementCtx): void => {
  const isColumn =
    layout.direction === FlexLayoutDirection.Column || layout.direction === FlexLayoutDirection.ColumnReverse;
  const isBaseline = (value: string | undefined): boolean =>
    value === LayoutAlignment.FirstBaseline || value === LayoutAlignment.LastBaseline;

  if (isColumn && isBaseline(layout.alignItems)) {
    context.addIssue({
      code: 'custom',
      path: ['alignItems'],
      message: 'Baseline alignment is unavailable when the FlexLayout cross axis is x.',
    });
  }

  const seenKeys = new Set<string>();
  layout.children.forEach((item, index) => {
    if (seenKeys.has(item.key)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'key'],
        message: `Duplicate FlexLayout item key '${item.key}'.`,
      });
    }
    seenKeys.add(item.key);
    if (isColumn && isBaseline(item.alignSelf)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'alignSelf'],
        message: 'Baseline alignment is unavailable when the FlexLayout cross axis is x.',
      });
    }
  });
};

export const FlexLayoutSchema = FlexLayoutBaseSchema.superRefine(refineFlexLayout).describe(
  'Canonical JSON-safe Standard FlexLayout composite.',
);
