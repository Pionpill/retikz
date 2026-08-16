import { ThemeTokenSource } from '@retikz/core';
import { NonNegativeIntegerSchema } from '@retikz/foundation';
import { z } from 'zod';

import { TableCellAppearanceTracePath, TableCellPlanSourceKind } from './constants';

const TableThemeTokenKeySchema = z.enum([
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
]);

/** 判断 Cell appearance token path 是否与其 local key 对应 */
const isLocalAppearanceTokenPath = (key: string, path: string): boolean => {
  if (path === `$spec/tableThemeTokens/${key}`) return true;
  if (path === `$default/light/${key}` || path === `$default/dark/${key}`) return true;
  const prefix = '$style/';
  const suffix = `/${key}`;
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) return false;
  const selector = path.slice(prefix.length, -suffix.length);
  return (
    (selector.endsWith('/light') && selector.length > '/light'.length) ||
    (selector.endsWith('/dark') && selector.length > '/dark'.length)
  );
};

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
      kind: z.literal(TableCellPlanSourceKind.StyleToken).describe('Discriminator for a resolved Table token winner.'),
      tokenKey: TableThemeTokenKeySchema.describe('Appearance Table token that supplied the winning leaf.'),
      tokenSource: z.enum(ThemeTokenSource).describe('Winning token source relation to the Table owner.'),
      tokenPath: z.string().min(1).describe('Stable effective Theme or IRTable source path.'),
    }),
    z.strictObject({
      kind: z
        .literal(TableCellPlanSourceKind.Encoding)
        .describe('Discriminator for an ordered visual encoding winner.'),
      encodingId: z.string().min(1).describe('Stable id of the winning Table visual encoding.'),
    }),
    z.strictObject({
      kind: z.literal(TableCellPlanSourceKind.RootRule).describe('Discriminator for an ordered root rule winner.'),
      ruleIndex: NonNegativeIntegerSchema.describe('Zero-based declaration index of the winning root rule.'),
    }),
  ])
  .superRefine((source, context) => {
    if (source.kind !== TableCellPlanSourceKind.StyleToken) return;
    if (
      source.tokenSource !== ThemeTokenSource.Local ||
      !isLocalAppearanceTokenPath(source.tokenKey, source.tokenPath)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['tokenPath'],
        message: 'Table Cell style token source and path must identify the same owner-local token',
      });
    }
  })
  .describe('Closed winner source for the currently executed Table Cell cascade.');

export const TableCellAppearanceTracePathSchema = z
  .enum(TableCellAppearanceTracePath)
  .describe('Canonical JSON Pointer for a resolved Cell appearance winner leaf.');
