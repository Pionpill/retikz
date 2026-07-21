import { ChildSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { z } from 'zod';

import { TablePresentationRefSchema } from '../presentation';

/** 数据值 Cell payload schema */
export const TableCellValuePayloadSchema = z
  .strictObject({
    kind: z.literal('value').describe('Discriminator for a scalar value Cell payload.'),
    value: ScalarValueSchema.describe('JSON scalar value presented as Core content at runtime.'),
    presentation: TablePresentationRefSchema.optional().describe(
      'Optional presentation provider reference. Omitted fields use the built-in text presentation.',
    ),
  })
  .describe('Scalar value Cell payload resolved through the presentation registry.');

/** 直接内容 Cell payload schema */
export const TableCellContentPayloadSchema = z
  .strictObject({
    kind: z.literal('content').describe('Discriminator for a direct Core child Cell payload.'),
    content: ChildSchema.describe('Direct JSON-safe Core or Tier 2 child authored in Cell-local coordinates.'),
  })
  .describe('Direct Core child Cell payload that bypasses value presentation.');

/** Cell 内容 payload schema */
export const TableCellPayloadSchema = z
  .discriminatedUnion('kind', [TableCellValuePayloadSchema, TableCellContentPayloadSchema])
  .describe('Table Cell payload: a scalar value presentation or direct Core child content.');

/** Cell 内容 payload */
export type IRTableCellPayload = z.infer<typeof TableCellPayloadSchema>;

/** 数据值 Cell payload */
export type IRTableCellValuePayload = z.infer<typeof TableCellValuePayloadSchema>;

/** 直接内容 Cell payload */
export type IRTableCellContentPayload = z.infer<typeof TableCellContentPayloadSchema>;
