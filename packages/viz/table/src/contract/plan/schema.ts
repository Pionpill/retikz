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
      kind: z.literal(TableCellPlanSourceKind.StyleToken).describe('Discriminator for a resolved style token winner.'),
      tokenKey: z
        .enum([
          'cell.background.fill',
          'cell.background.fillOpacity',
          'cell.content.color',
          'cell.content.font.family',
          'cell.content.font.weight',
          'columnHeader.background.fill',
          'columnHeader.background.fillOpacity',
          'columnHeader.content.color',
          'columnHeader.content.font.family',
          'columnHeader.content.font.weight',
          'columnHeader.border.bottom',
        ])
        .describe('Appearance style token that supplied the winning leaf.'),
      tokenSource: z.enum(['preset', 'user']).describe('Preset or user overlay winner for this token.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellPlanSourceKind.Encoding)
        .describe('Discriminator for an ordered visual encoding winner.'),
      encodingId: z.string().min(1).describe('Stable id of the winning Table visual encoding.'),
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
