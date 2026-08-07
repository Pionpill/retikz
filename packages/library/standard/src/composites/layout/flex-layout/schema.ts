import { CompositeBaseSchema, LayoutAlignmentGuideDimension } from '@retikz/core';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
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

const FlexLayoutGapSchema = z
  .union([
    LayoutGapSchema.describe('Uniform physical gap applied to both columns and rows.'),
    z
      .strictObject({
        column: LayoutGapSchema.describe('Physical horizontal gap between items or lines.'),
        row: LayoutGapSchema.describe('Physical vertical gap between items or lines.'),
      })
      .describe('Independent physical column and row gaps.'),
  ])
  .transform(gap => (typeof gap === 'number' ? { column: gap, row: gap } : gap))
  .default({ column: 0, row: 0 })
  .describe('Physical gaps between items and lines; a number applies uniformly to both axes.');

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
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal('flexLayout').describe('Composite type for deterministic one-dimensional box layout.'),
  ...LayoutContainerBoxSchema.shape,
  direction: z.enum(FlexLayoutDirection).default(FlexLayoutDirection.Row).describe('Physical main-axis direction.'),
  wrap: z.enum(FlexLayoutWrap).default(FlexLayoutWrap.NoWrap).describe('Line wrapping and cross traversal policy.'),
  gap: FlexLayoutGapSchema,
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

const FlexLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  line: z.number().int().safe().nonnegative().describe('Resolved physical flex line index containing the item.'),
}).describe('FlexLayout item placement artifact.');

const FlexLayoutLineArtifactSchema = z
  .strictObject({
    index: z.number().int().safe().nonnegative().describe('Contiguous physical cross-axis line index.'),
    itemKeys: z.array(z.string().min(1)).describe('Item keys in this line layout traversal order.'),
    mainAxis: z.enum(LayoutAlignmentGuideDimension).describe('Physical main axis used for line item distribution.'),
    mainStart: z.number().describe('Finite main-axis line start in container allocation coordinates.'),
    mainSize: z.number().nonnegative().describe('Finite non-negative main-axis line size.'),
    crossStart: z.number().describe('Finite physical cross-axis line start.'),
    crossSize: z.number().nonnegative().describe('Finite non-negative resolved line cross size.'),
  })
  .describe('Resolved FlexLayout line artifact.');

const FlexLayoutArtifactBaseSchema = z.strictObject({
  kind: z.literal(LayoutItemKind.Flex).describe('Discriminator for a FlexLayout artifact payload.'),
  container: LayoutArtifactContainerSchema.describe('Resolved container geometry.'),
  items: z.array(FlexLayoutArtifactItemSchema).describe('Items in authored source order.'),
  lines: z.array(FlexLayoutLineArtifactSchema).describe('Lines in final physical cross-axis order.'),
  spacing: z.array(LayoutSpacingArtifactSchema).describe('Resolved fixed gaps and distributed free-space segments.'),
});

/** 校验 Flex artifact 的 authored identity 与 line 双向 partition */
const refineFlexLayoutArtifact = (artifact: z.infer<typeof FlexLayoutArtifactBaseSchema>, context: z.RefinementCtx) => {
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
