import { LayoutAlignmentGuideDimension } from '@retikz/core';
import { z } from 'zod';

import {
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutItemKind,
  LayoutSpacingArtifactSchema,
} from '../shared/layout';

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
