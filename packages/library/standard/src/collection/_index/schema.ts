import { GraphicColorSchema, GraphicElementOpacitySchema, TextVisualSchema } from '@retikz/core';
import { NonNegativeIntegerSchema } from '@retikz/foundation';
import { array, enum as zodEnum, never, strictObject, string, union } from 'zod';

/** 索引文本外观，复用 Node 样式字段，不继承单格覆盖 */
export const CollectionIndexStyleSchema = strictObject({
  ...TextVisualSchema.shape,
  ...GraphicColorSchema.shape,
  ...GraphicElementOpacitySchema.shape,
}).describe('Index text appearance; cell-level styles do not affect indices.');

const CollectionIndexBaseSchema = strictObject({
  position: zodEnum(['before', 'after'])
    .default('before')
    .describe('Before means above a row or left of a column; after means below or right.'),
  style: CollectionIndexStyleSchema.optional().describe(
    'Index text appearance; cell-level styles do not affect indices.',
  ),
});

/** 校验格外索引的起始编号或显式标签；两种索引来源互斥 */
export const CollectionIndexOptionsSchema = union([
  CollectionIndexBaseSchema.extend({
    start: NonNegativeIntegerSchema.default(0).describe('First displayed index; not cell identity.'),
    labels: never().optional().describe('Not accepted in this input branch.'),
  }),
  CollectionIndexBaseSchema.extend({
    labels: array(string()).describe(
      'Outside labels in cell order; empty text hides a label. Length must match cells.',
    ),
    start: never().optional().describe('Not accepted in this input branch.'),
  }),
]).describe('Index strip placement and either automatic numbering or explicit labels.');
