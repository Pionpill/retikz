import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import {
  defineRegressionImplementation,
  resolveRegressionImplementationRegistry,
  defineRegression,
  RegressionMethodSchema,
  resolveRegression,
  resolveRegressionRegistry,
  RetikzDataError,
} from '../src';

const pairs = [0, 1, 2, 3].map(x => ({ x, y: 1 + 2 * x }));

const custom = defineRegression({
  schema: strictObject({ kind: literal('custom-fit'), degree: number().int().default(1) }),
});
const customImplementation = defineRegressionImplementation({
  definition: custom,
  fit: (_pairs, operation) => ({ predict: x => x ** operation.degree }),
});
describe('regression registry', () => {
  it('roundtrips JSON methods and resolves exact defaults once', () => {
    const operation = { kind: 'custom-fit' };
    expect(RegressionMethodSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
    const registry = resolveRegressionRegistry([custom]);
    const resolved = resolveRegression(
      operation,
      registry,
      resolveRegressionImplementationRegistry(registry, [customImplementation]),
    );
    expect(resolved.fit(pairs).predict(3)).toBe(3);
    expect(() =>
      resolveRegression(
        { kind: 'custom-fit', extra: true },
        registry,
        resolveRegressionImplementationRegistry(registry, [customImplementation]),
      ),
    ).toThrow(RetikzDataError);
  });
  it('rejects missing, duplicate, and blank registrations', () => {
    expect(() => resolveRegression({ kind: 'missing' })).toThrow(/not registered/);
    expect(() => resolveRegressionRegistry([custom, custom])).toThrow(/duplicate/);
    expect(() =>
      resolveRegressionRegistry([defineRegression({ schema: strictObject({ kind: literal('linear') }) })]),
    ).toThrow(/duplicate/);
    expect(() =>
      resolveRegressionRegistry([defineRegression({ schema: strictObject({ kind: literal(' ') }) })]),
    ).toThrow(/non-blank/);
  });
  it('fits built-ins through the same consumer', () => {
    for (const kind of ['linear', 'quadratic', 'polynomial'])
      expect(resolveRegression({ kind }).fit(pairs).predict(1.5)).toBeCloseTo(4);
    const xs = [1, 2, 3, 4];
    for (const [kind, predict] of [
      ['logarithmic', (x: number) => 2 + 3 * Math.log(x)],
      ['exponential', (x: number) => 2 * Math.exp(x)],
      ['power', (x: number) => 2 * x ** 3],
    ] as const)
      expect(
        resolveRegression({ kind })
          .fit(xs.map(x => ({ x, y: predict(x) })))
          .predict(2.5),
      ).toBeCloseTo(predict(2.5));
    expect(() => resolveRegression({ kind: 'polynomial', order: 7 })).toThrow();
    expect(() => resolveRegression({ kind: 'logarithmic' }).validateExtent([-1, 2])).toThrow(/positive/);
  });
  it('preserves callback causes and rejects non-finite predictions', () => {
    const cause = new Error('custom failure');
    const bad = defineRegression({ schema: strictObject({ kind: literal('bad') }) });
    const badImplementation = defineRegressionImplementation({
      definition: bad,
      fit: () => {
        throw cause;
      },
    });
    try {
      resolveRegression(
        { kind: 'bad' },
        resolveRegressionRegistry([bad]),
        resolveRegressionImplementationRegistry(resolveRegressionRegistry([bad]), [badImplementation]),
      ).fit(pairs);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzDataError);
      expect(error).toHaveProperty('cause', cause);
    }
    const infinite = defineRegression({ schema: strictObject({ kind: literal('infinite') }) });
    const infiniteImplementation = defineRegressionImplementation({
      definition: infinite,
      fit: () => ({ predict: () => Infinity }),
    });
    expect(() =>
      resolveRegression(
        { kind: 'infinite' },
        resolveRegressionRegistry([infinite]),
        resolveRegressionImplementationRegistry(resolveRegressionRegistry([infinite]), [infiniteImplementation]),
      )
        .fit(pairs)
        .predict(1),
    ).toThrow(/non-finite/);
  });
});

it('parses defaults once for repeated groups', () => {
  let parses = 0;
  const definition = defineRegression({
    schema: strictObject({ kind: literal('observed-schema'), exponent: number().default(2) }).superRefine(() => {
      parses += 1;
    }),
  });
  const definitionImplementation = defineRegressionImplementation({
    definition,
    fit: (_pairs, operation) => ({ predict: x => x ** operation.exponent }),
  });
  const resolved = resolveRegression(
    { kind: 'observed-schema' },
    resolveRegressionRegistry([definition]),
    resolveRegressionImplementationRegistry(resolveRegressionRegistry([definition]), [definitionImplementation]),
  );
  for (let index = 0; index < 3; index++) expect(resolved.fit(pairs).predict(3)).toBe(9);
  expect(parses).toBe(1);
});
