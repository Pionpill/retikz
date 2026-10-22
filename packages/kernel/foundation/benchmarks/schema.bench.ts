import {
  assertNonEmptyString,
  assertPositiveNumber,
  createOpenStringSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  NormalizedFractionSchema,
  PositiveIntegerSchema,
  PositiveNumberSchema,
  RetikzFoundationError,
} from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { captureFailure } from './_workloads';

for (const [name, schema, valid, invalid] of [
  ['非空白字符串', NonBlankStringSchema, ' node ', '   '],
  ['正数', PositiveNumberSchema, 1.5, 0],
  ['非负数', NonNegativeNumberSchema, 0, -1],
  ['正整数', PositiveIntegerSchema, 1, 1.5],
  ['非负整数', NonNegativeIntegerSchema, 0, -1],
  ['归一化比例', NormalizedFractionSchema, 0.5, 1.1],
] as const) {
  for (const success of [true, false]) {
    defineBenchmark(
      {
        id: `scalarSchema/${name}/${success ? 'valid' : 'invalid'}`,
        dimensions: ['标量校验', `${name}·${success ? '合法' : '拒绝'}`, '单值'],
      },
      () => ({
        run: () => schema.safeParse(success ? valid : invalid),
        verify: result => {
          expect(result.success).toBe(success);
          if (result.success) expect(result.data).toBe(valid);
        },
      }),
    );
  }
}
for (const count of [8, 32, 128]) {
  defineBenchmark(
    { id: `createOpenStringSchema/count=${count}`, dimensions: ['开放字符串 schema', '创建', `${count}枚举项`] },
    () => {
      const values = Object.fromEntries(Array.from({ length: count }, (_, index) => [`Key${index}`, `value-${index}`]));
      return {
        run: () => createOpenStringSchema(values),
        verify: result => {
          expect(result.parse('value-0')).toBe('value-0');
          expect(result.parse('custom')).toBe('custom');
          expect(result.safeParse('  ').success).toBe(false);
        },
      };
    },
  );
}
const shapeValues = { Circle: 'circle', Rect: 'rect', Path: 'path' } as const;
for (const [label, input, success] of [
  ['已知值', 'circle', true],
  ['自定义值', 'custom', true],
  ['空白值', '  ', false],
] as const) {
  defineBenchmark({ id: `openStringSchema/${label}`, dimensions: ['开放字符串 schema', label, '单值'] }, () => {
    const schema = createOpenStringSchema(shapeValues);
    return {
      run: () => schema.safeParse(input),
      verify: result => {
        expect(result.success).toBe(success);
        if (result.success) expect(result.data).toBe(input);
      },
    };
  });
}
for (const [label, run] of [
  ['非空字符串', () => assertNonEmptyString('node', 'id')],
  ['正数', () => assertPositiveNumber(1, 'weight')],
] as const) {
  defineBenchmark({ id: `assert/${label}/valid`, dimensions: ['基础断言', label, '单值成功'] }, () => ({
    run,
    verify: result => expect(result).toBeUndefined(),
  }));
}
for (const [label, run] of [
  ['空白字符串', () => assertNonEmptyString('  ', 'id')],
  ['非正数', () => assertPositiveNumber(0, 'weight')],
] as const) {
  defineBenchmark({ id: `assert/${label}/invalid`, dimensions: ['基础断言', label, '单值拒绝'] }, () => ({
    run: () => captureFailure(run),
    verify: result => expect(result).toBeInstanceOf(RetikzFoundationError),
  }));
}
