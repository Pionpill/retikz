import { z } from 'zod';

const OpSchema = z.enum(['==', '>=', '<=', '>', '<']);

export const AssertionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('textPresent'),
    text: z.string().min(1),
    match: z.enum(['contains', 'exact']).optional(),
    description: z.string().optional(),
  }),
  z.object({
    kind: z.literal('primitiveCount'),
    primitive: z.enum(['rect', 'ellipse', 'text', 'path', 'group']),
    op: OpSchema,
    value: z.number().int().nonnegative(),
    description: z.string().optional(),
  }),
  z.object({
    kind: z.literal('arrowCount'),
    op: OpSchema,
    value: z.number().int().nonnegative(),
    description: z.string().optional(),
  }),
  z.object({
    kind: z.literal('stylePresent'),
    style: z.enum(['fill', 'dashed', 'stroke']),
    description: z.string().optional(),
  }),
]);

export type Assertion = z.infer<typeof AssertionSchema>;

/** 单条断言求值结果：pass + 人读实测值（进失败明细） */
export type AssertionResult = {
  kind: Assertion['kind'];
  description?: string;
  pass: boolean;
  actual: string;
};
