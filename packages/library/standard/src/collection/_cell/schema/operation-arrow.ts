import { ArrowEndDetailSchema } from '@retikz/core';
import { boolean, strictObject, union } from 'zod';

import { OpenBorderSchema } from './open-border';

/** 线性集合进出箭头的外观，路径几何由集合负责 */
export const OperationArrowSchema = union([
  boolean(),
  OpenBorderSchema.pick({ style: true }).extend({
    arrowDetail: ArrowEndDetailSchema.optional().describe(
      'Appearance of the terminal arrow tip; custom registered shapes are supported.',
    ),
  }),
])
  .default(false)
  .describe('Operation arrow; true uses the default appearance and false hides it.');

/** 线性集合的成对操作箭头，布尔值统一控制两侧 */
export const CollectionArrowSchema = union([
  boolean(),
  strictObject({
    input: OperationArrowSchema.describe('Incoming operation arrow; omitted means hidden.'),
    output: OperationArrowSchema.describe('Outgoing operation arrow; omitted means hidden.'),
  }),
])
  .default(false)
  .describe('Operation arrows; boolean controls both sides, object configures each side independently.');
