import { z } from 'zod';

import { TableCellAppearanceTracePath, TableCellPlanSourceKind } from './constants';

export const TableCellPlanSourceSchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal(TableCellPlanSourceKind.Default).describe('Discriminator for a built-in Cell default winner.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellPlanSourceKind.Structure)
        .describe('Discriminator for a structure-authored Cell winner.'),
    }),
    z.strictObject({
      kind: z.literal(TableCellPlanSourceKind.RootRule).describe('Discriminator for an ordered root rule winner.'),
      ruleIndex: z.number().int().nonnegative().describe('Zero-based declaration index of the winning root rule.'),
    }),
  ])
  .describe('Closed winner source for the currently executed Table Cell cascade.');

export const TableCellAppearanceTracePathSchema = z
  .enum(TableCellAppearanceTracePath)
  .describe('Canonical JSON Pointer for a resolved Cell appearance winner leaf.');
