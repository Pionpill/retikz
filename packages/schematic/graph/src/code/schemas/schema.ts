import { ChildSchema } from '@retikz/core';
import { array, boolean, discriminatedUnion, literal, strictObject, string } from 'zod';

import { BlockSchema, refineBlockSize } from '../../schemas/block';

const blockFields = strictObject(BlockSchema.shape).omit({ namespace: true, type: true, children: true }).shape;

export const CodeBlockPropsSchema = strictObject({
  ...blockFields,
  name: string().min(1).describe('Code entity name.'),
  description: string().optional().describe('Optional entity description.'),
  icon: ChildSchema.nullable().optional().describe('Header icon; omitted uses the entity marker, null hides it.'),
  trail: ChildSchema.nullable().optional().describe('Header trail; omitted uses the entity marker, null hides it.'),
})
  .superRefine(refineBlockSize)
  .describe('Code entity Block surface without discriminator or authored children.');

export const CodeParameterSchema = strictObject({
  name: string().min(1).describe('Parameter name.'),
  typeText: string().optional().describe('Descriptive type expression.'),
  optional: boolean().optional().describe('Optional parameter; omitted means false.'),
  description: string().optional().describe('Parameter description.'),
}).describe('Descriptive parameter contract, without executable default values.');

export const CodeSignatureSchema = strictObject({
  parameters: array(CodeParameterSchema)
    .optional()
    .describe('Ordered parameters; omitted means unspecified, empty means no parameters.'),
  returnType: string().optional().describe('Return type expression; omitted means unspecified.'),
  description: string().optional().describe('Signature description.'),
}).describe('Descriptive callable signature.');

export const CodePropertySchema = strictObject({
  id: BlockSchema.shape.id,
  name: string().min(1).describe('Property name.'),
  typeText: string().optional().describe('Descriptive type expression.'),
  optional: boolean().optional().describe('Optional property; omitted means false.'),
  readonly: boolean().optional().describe('Read-only marker; omitted means false.'),
  description: string().optional().describe('Property description.'),
}).describe('Property declaration without an actual or initial value.');

const CodeLogicTextSchema = strictObject({
  kind: literal('text').describe('Text logic discriminator.'),
  text: string().min(1).describe('Nonempty logic description.'),
});
const CodeLogicStepsSchema = strictObject({
  kind: literal('steps').describe('Ordered steps discriminator.'),
  steps: array(string().min(1)).min(1).describe('Nonempty ordered descriptive steps; positions are not identities.'),
});
export const CodeLogicSchema = strictObject({
  id: BlockSchema.shape.id,
  title: string().optional().describe('Optional logic title.'),
  body: discriminatedUnion('kind', [CodeLogicTextSchema, CodeLogicStepsSchema]).describe(
    'Descriptive logic content, never executed.',
  ),
}).describe('A named or anonymous descriptive logic region.');

export const CodeMethodSchema = strictObject({
  id: BlockSchema.shape.id,
  name: string().min(1).describe('Callable member name; overload names may repeat.'),
  signature: CodeSignatureSchema.describe('Required callable signature.'),
  logic: CodeLogicSchema.optional().describe('Optional behavior description.'),
}).describe('Callable member contract.');
