import type { infer as ZodInfer, RefinementCtx } from 'zod';

import { CompositeBaseSchema, LayoutAlignmentGuideDimension } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeIntegerSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { array, enum as zodEnum, literal, number, strictObject, union } from 'zod';

import { LAYOUT_NAMESPACE } from '../../shared';
import {
  LayoutAlignment,
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutDistributionSchema,
  LayoutGapSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
  LayoutSpacingArtifactSchema,
} from '../shared';
import { FlexLayoutDirection, FlexLayoutWrap } from './constants';

const FLEX_LAYOUT_CONTENT_BASIS = 'content' as const;

const FlexLayoutGapSchema = union([
  LayoutGapSchema.describe('Uniform physical gap applied to both columns and rows.'),
  strictObject({
    column: LayoutGapSchema.describe('Physical horizontal gap between items or lines.'),
    row: LayoutGapSchema.describe('Physical vertical gap between items or lines.'),
  }).describe('Independent physical column and row gaps.'),
])
  .transform(gap => (typeof gap === 'number' ? { column: gap, row: gap } : gap))
  .default({ column: 0, row: 0 })
  .describe('Physical gaps between items and lines; a number applies uniformly to both axes.');

export const FlexMainDistributionSchema = zodEnum([
  LayoutDistribution.Start,
  LayoutDistribution.Center,
  LayoutDistribution.End,
  LayoutDistribution.SpaceBetween,
  LayoutDistribution.SpaceAround,
  LayoutDistribution.SpaceEvenly,
]).describe('Distribution of remaining main-axis space between flex items.');

export const FlexLayoutItemSchema = LayoutItemBaseSchema.extend({
  kind: literal(LayoutItemKind.Flex).describe('Discriminator for a FlexLayout item.'),
  basis: union([literal(FLEX_LAYOUT_CONTENT_BASIS), NonNegativeNumberSchema])
    .default(FLEX_LAYOUT_CONTENT_BASIS)
    .describe('Natural content contribution or authored main-axis base slot.'),
  grow: NonNegativeNumberSchema.default(0).describe('Non-negative factor for receiving positive free space.'),
  shrink: NonNegativeNumberSchema.default(1).describe('Non-negative factor applied to the base slot for shrink.'),
  min: NonNegativeNumberSchema.optional().describe('Optional authored hard minimum main-axis slot.'),
  max: NonNegativeNumberSchema.optional().describe('Optional authored hard maximum main-axis slot.'),
  alignSelf: zodEnum(LayoutAlignment)
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
  namespace: literal(LAYOUT_NAMESPACE).describe('Composite namespace for Layout capabilities.'),
  type: literal('flexLayout').describe('Composite type for deterministic one-dimensional box layout.'),
  ...LayoutContainerBoxSchema.shape,
  direction: zodEnum(FlexLayoutDirection).default(FlexLayoutDirection.Row).describe('Physical main-axis direction.'),
  wrap: zodEnum(FlexLayoutWrap).default(FlexLayoutWrap.NoWrap).describe('Line wrapping and cross traversal policy.'),
  gap: FlexLayoutGapSchema,
  justifyContent: FlexMainDistributionSchema.default(LayoutDistribution.Start).describe(
    'Distribution of remaining main-axis space within each line.',
  ),
  alignItems: zodEnum(LayoutAlignment)
    .default(LayoutAlignment.Stretch)
    .describe('Default cross-axis alignment for flex items.'),
  alignContent: LayoutDistributionSchema.default(LayoutDistribution.Start).describe(
    'Distribution of remaining cross-axis space between wrapped lines.',
  ),
  children: array(FlexLayoutItemSchema).default([]).describe('Authored flex items in stable paint order.'),
});

type FlexLayoutRefinementInput = ZodInfer<typeof FlexLayoutBaseSchema>;

/** 校验 FlexLayout 跨字段方向、baseline 与本地 key 契约 */
const refineFlexLayout = (layout: FlexLayoutRefinementInput, context: RefinementCtx): void => {
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
    if (item.key !== undefined && seenKeys.has(item.key)) {
      context.addIssue({
        code: 'custom',
        path: ['children', index, 'key'],
        message: `Duplicate FlexLayout item key '${item.key}'.`,
      });
    }
    if (item.key !== undefined) seenKeys.add(item.key);
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
  'Canonical JSON-safe Layout FlexLayout composite.',
);

const FlexLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  line: NonNegativeIntegerSchema.describe('Resolved physical flex line index containing the item.'),
}).describe('FlexLayout item placement artifact.');

const FlexLayoutLineArtifactSchema = strictObject({
  index: NonNegativeIntegerSchema.describe('Contiguous physical cross-axis line index.'),
  itemKeys: array(NonBlankStringSchema).describe('Item keys in this line layout traversal order.'),
  mainAxis: zodEnum(LayoutAlignmentGuideDimension).describe('Physical main axis used for line item distribution.'),
  mainStart: number().describe('Finite main-axis line start in container allocation coordinates.'),
  mainSize: NonNegativeNumberSchema.describe('Finite non-negative main-axis line size.'),
  crossStart: number().describe('Finite physical cross-axis line start.'),
  crossSize: NonNegativeNumberSchema.describe('Finite non-negative resolved line cross size.'),
}).describe('Resolved FlexLayout line artifact.');

const FlexLayoutArtifactBaseSchema = strictObject({
  kind: literal(LayoutItemKind.Flex).describe('Discriminator for a FlexLayout artifact payload.'),
  container: LayoutArtifactContainerSchema.describe('Resolved container geometry.'),
  items: array(FlexLayoutArtifactItemSchema).describe('Items in authored source order.'),
  lines: array(FlexLayoutLineArtifactSchema).describe('Lines in final physical cross-axis order.'),
  spacing: array(LayoutSpacingArtifactSchema).describe('Resolved fixed gaps and distributed free-space segments.'),
});

/** 校验 Flex artifact 的 authored identity 与 line 双向 partition */
const refineFlexLayoutArtifact = (artifact: ZodInfer<typeof FlexLayoutArtifactBaseSchema>, context: RefinementCtx) => {
  const keys = new Set<string>();
  artifact.items.forEach((item, index) => {
    if (item.sourceIndex !== index) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'sourceIndex'],
        message: 'sourceIndex must be contiguous.',
      });
    }
    if (keys.has(item.key)) {
      context.addIssue({ code: 'custom', path: ['items', index, 'key'], message: `Duplicate item key '${item.key}'.` });
    }
    keys.add(item.key);
  });
  const partition = new Map<string, number>();
  artifact.lines.forEach((line, index) => {
    if (line.index !== index) {
      context.addIssue({ code: 'custom', path: ['lines', index, 'index'], message: 'Line index must be contiguous.' });
    }
    line.itemKeys.forEach((key, keyIndex) => {
      if (!keys.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'itemKeys', keyIndex],
          message: `Unknown item key '${key}'.`,
        });
      }
      if (partition.has(key)) {
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'itemKeys', keyIndex],
          message: `Duplicate line item key '${key}'.`,
        });
      }
      partition.set(key, index);
    });
  });
  artifact.items.forEach((item, index) => {
    if (item.line >= artifact.lines.length || partition.get(item.key) !== item.line) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'line'],
        message: 'Item line must match the line partition.',
      });
    }
  });
};

export const FlexLayoutArtifactSchema = FlexLayoutArtifactBaseSchema.superRefine(refineFlexLayoutArtifact).describe(
  'Canonical JSON-safe FlexLayout compile artifact payload.',
);
