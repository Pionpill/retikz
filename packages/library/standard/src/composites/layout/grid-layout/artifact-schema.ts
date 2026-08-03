import { z } from 'zod';

import {
  LayoutArtifactContainerSchema,
  LayoutArtifactItemBaseSchema,
  LayoutItemKind,
  LayoutSpacingArtifactSchema,
  LayoutTrackArtifactSchema,
} from '../shared';

const GridLayoutArtifactItemSchema = LayoutArtifactItemBaseSchema.extend({
  column: z.number().int().safe().nonnegative().describe('Resolved zero-based column start.'),
  row: z.number().int().safe().nonnegative().describe('Resolved zero-based row start.'),
  columnSpan: z.number().int().safe().positive().describe('Positive resolved column span.'),
  rowSpan: z.number().int().safe().positive().describe('Positive resolved row span.'),
}).describe('GridLayout item placement artifact.');

const GridLayoutArtifactBaseSchema = z.strictObject({
  kind: z.literal(LayoutItemKind.Grid).describe('Discriminator for a GridLayout artifact payload.'),
  container: LayoutArtifactContainerSchema.describe('Resolved container geometry.'),
  items: z.array(GridLayoutArtifactItemSchema).describe('Items in authored source order.'),
  columns: z.array(LayoutTrackArtifactSchema).describe('Resolved columns in physical start order.'),
  rows: z.array(LayoutTrackArtifactSchema).describe('Resolved rows in physical start order.'),
  spacing: z.array(LayoutSpacingArtifactSchema).describe('Resolved fixed gaps and distributed free-space segments.'),
});

/** 校验 Grid artifact 的 authored identity、track 序列与 item spans */
const refineGridLayoutArtifact = (artifact: z.infer<typeof GridLayoutArtifactBaseSchema>, context: z.RefinementCtx) => {
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
    if (item.column + item.columnSpan > artifact.columns.length) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'columnSpan'],
        message: 'Column span exceeds resolved columns.',
      });
    }
    if (item.row + item.rowSpan > artifact.rows.length) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'rowSpan'],
        message: 'Row span exceeds resolved rows.',
      });
    }
  });
  const refineTracks = (tracks: typeof artifact.columns, path: 'columns' | 'rows') => {
    tracks.forEach((track, index) => {
      if (track.index !== index) {
        context.addIssue({ code: 'custom', path: [path, index, 'index'], message: 'Track index must be contiguous.' });
      }
      if (index > 0 && track.start < tracks[index - 1].start) {
        context.addIssue({
          code: 'custom',
          path: [path, index, 'start'],
          message: 'Tracks must be in physical start order.',
        });
      }
    });
  };
  refineTracks(artifact.columns, 'columns');
  refineTracks(artifact.rows, 'rows');
};

export const GridLayoutArtifactSchema = GridLayoutArtifactBaseSchema.superRefine(refineGridLayoutArtifact).describe(
  'Canonical JSON-safe GridLayout compile artifact payload.',
);
