import {
  assertPlainDataContainers,
  cloneAndFreezeJson,
  JsonValueSchema,
  JsonObjectSchema,
  RetikzFoundationError,
} from '@retikz/foundation';
import type { JsonValue } from '@retikz/foundation';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../scripts/benchmarks/scenario';
import { captureFailure, formatCount, inputCounts } from './_workloads';

for (const count of inputCounts) {
  for (const shape of ['numbers', 'records', 'nested'] as const) {
    const label =
      shape === 'numbers' ? '数值数组' : shape === 'records' ? '对象数组·每条4字段' : '嵌套对象·每组100数值';
    for (const operation of ['cloneAndFreezeJson', 'JsonValueSchema'] as const) {
      defineBenchmark(
        {
          id: `${operation}/${shape}/count=${count}`,
          dimensions: [
            operation === 'cloneAndFreezeJson' ? 'JSON 冻结快照' : 'JSON 值校验',
            label,
            `${formatCount(count)}${shape === 'records' ? '条' : '数值'}`,
          ],
        },
        () => {
          const input: Array<JsonValue> =
            shape === 'numbers'
              ? Array.from({ length: count }, (_, index) => index)
              : shape === 'records'
                ? Array.from({ length: count }, (_, index) => ({
                    id: index,
                    label: `item-${index}`,
                    enabled: index % 2 === 0,
                    value: index / 10,
                  }))
                : Array.from({ length: count / 100 }, (_groupValue, group) => ({
                    values: Array.from({ length: 100 }, (_, index) => group * 100 + index),
                  }));
          return {
            run: () => (operation === 'cloneAndFreezeJson' ? cloneAndFreezeJson(input) : JsonValueSchema.parse(input)),
            verify: result => {
              expect(result).toEqual(input);
              expect(result).not.toBe(input);
              expect(Object.isFrozen(input)).toBe(false);
              if (Array.isArray(result) && shape !== 'numbers') expect(result[0]).not.toBe(input[0]);
              if (operation === 'cloneAndFreezeJson') {
                const pending: Array<JsonValue> = [result];
                let frozen = true;
                while (pending.length > 0) {
                  const value = pending.pop();
                  if (value !== null && typeof value === 'object') {
                    frozen = frozen && Object.isFrozen(value);
                    for (const child of Object.values(value))
                      if (child !== null && typeof child === 'object') pending.push(child);
                  }
                }
                expect(frozen).toBe(true);
              }
            },
          };
        },
        count === 1_000_000,
      );
    }
  }
  defineBenchmark(
    {
      id: `JsonObjectSchema/properties/count=${count}`,
      dimensions: ['JSON 对象校验', '数值属性', `${formatCount(count)}属性`],
    },
    () => {
      const input = Object.fromEntries(Array.from({ length: count }, (_, index) => [`key-${index}`, index]));
      return {
        run: () => JsonObjectSchema.parse(input),
        verify: result => {
          expect(result).toEqual(input);
          expect(result).not.toBe(input);
        },
      };
    },
    count === 1_000_000,
  );
}

for (const count of [16, 128, 1_024]) {
  defineBenchmark(
    { id: `assertPlainDataContainers/config/count=${count}`, dimensions: ['容器检查', '配置对象', `${count}属性`] },
    () => {
      const input = Object.fromEntries(
        Array.from({ length: count }, (_, index) => [`option-${index}`, { enabled: true, value: index }]),
      );
      return {
        run: () => assertPlainDataContainers(input),
        verify: result => {
          expect(result).toBeUndefined();
          expect(input['option-0']).toEqual({ enabled: true, value: 0 });
          expect(Object.isFrozen(input)).toBe(false);
        },
      };
    },
  );
}
for (const depth of [8, 32, 128]) {
  for (const operation of ['cloneAndFreezeJson', 'assertPlainDataContainers', 'JsonValueSchema'] as const) {
    defineBenchmark({ id: `${operation}/depth=${depth}`, dimensions: [operation, '单链嵌套', `${depth}层`] }, () => {
      let input: JsonValue = 1;
      for (let index = 0; index < depth; index++) input = { child: input };
      return {
        run: () =>
          operation === 'cloneAndFreezeJson'
            ? cloneAndFreezeJson(input)
            : operation === 'JsonValueSchema'
              ? JsonValueSchema.parse(input)
              : assertPlainDataContainers(input),
        verify: result =>
          operation === 'assertPlainDataContainers' ? expect(result).toBeUndefined() : expect(result).toEqual(input),
      };
    });
  }
}
for (const location of ['first', 'last'] as const) {
  for (const operation of ['cloneAndFreezeJson', 'JsonValueSchema'] as const) {
    defineBenchmark(
      {
        id: `${operation}/invalid-${location}`,
        dimensions: [operation, `非法叶子·${location === 'first' ? '首项' : '末项'}`, '1千项'],
      },
      () => {
        const input = Array.from({ length: 1_000 }, (_, index) => index);
        input[location === 'first' ? 0 : 999] = Infinity;
        return {
          run: () =>
            operation === 'cloneAndFreezeJson'
              ? captureFailure(() => cloneAndFreezeJson(input))
              : JsonValueSchema.safeParse(input),
          verify: result => {
            if (operation === 'cloneAndFreezeJson') expect(result).toBeInstanceOf(RetikzFoundationError);
            else expect(result).toMatchObject({ success: false });
          },
        };
      },
    );
  }
}
defineBenchmark(
  { id: 'assertPlainDataContainers/accessor', dimensions: ['容器检查', '拒绝 accessor', '单属性'] },
  () => {
    let reads = 0;
    const input = {
      get value() {
        reads++;
        return 1;
      },
    };
    return {
      run: () => captureFailure(() => assertPlainDataContainers(input)),
      verify: result => {
        expect(result).toBeInstanceOf(RetikzFoundationError);
        expect(reads).toBe(0);
      },
    };
  },
);
