import { NonBlankStringSchema, NonNegativeIntegerSchema } from '@retikz/foundation';
import { discriminatedUnion, enum as zodEnum, literal, strictObject } from 'zod';

import { TableCellAppearanceTracePath, TableCellPlanSourceKind } from './constants';

/** Cell cascade 中正式 Source defaults 的来源记录 */
const TableCellDefaultsSourceSchema = strictObject({
  kind: literal(TableCellPlanSourceKind.Defaults).describe('Discriminator for a formal Table Source defaults winner.'),
  path: NonBlankStringSchema.describe('Stable formal Table Source defaults path.'),
}).describe('Formal Table Source defaults winner with its authored source path.');

export const TableCellPlanSourceSchema = discriminatedUnion('kind', [
  strictObject({
    kind: literal(TableCellPlanSourceKind.Default).describe('Discriminator for a built-in Cell default winner.'),
  }),
  TableCellDefaultsSourceSchema,
  strictObject({
    kind: literal(TableCellPlanSourceKind.Structure).describe('Discriminator for a structure-authored Cell winner.'),
  }),
  strictObject({
    kind: literal(TableCellPlanSourceKind.Encoding).describe('Discriminator for an ordered visual encoding winner.'),
    encodingId: NonBlankStringSchema.describe('Stable id of the winning Table visual encoding.'),
  }),
  strictObject({
    kind: literal(TableCellPlanSourceKind.RootRule).describe('Discriminator for an ordered root rule winner.'),
    ruleIndex: NonNegativeIntegerSchema.describe('Zero-based declaration index of the winning root rule.'),
  }),
]).describe('Closed winner source for the currently executed Table Cell cascade.');

export const TableCellAppearanceTracePathSchema = zodEnum(TableCellAppearanceTracePath).describe(
  'Canonical JSON Pointer for a resolved Cell appearance winner leaf.',
);
