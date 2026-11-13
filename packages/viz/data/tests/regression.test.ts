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
  evaluateRegression,
  RetikzDataErrorCode,
} from '../src';

const pairs = [0, 1, 2, 3].map(x => ({ x, y: 1 + 2 * x }));

describe('拟合评价与自动选择', () => {
  it('在原始观测上计算误差、负 R² 和常量响应', () => {
    expect(evaluateRegression(pairs, { predict: x => 1 + 2 * x })).toEqual({ rSquared: 1, meanSquaredError: 0 });
    expect(evaluateRegression(pairs, { predict: () => 0 })).toEqual({ rSquared: -3.2, meanSquaredError: 21 });
    expect(
      evaluateRegression(
        [
          { x: 0, y: 2 },
          { x: 1, y: 2 },
        ],
        { predict: () => 3 },
      ),
    ).toEqual({ rSquared: null, meanSquaredError: 1 });
    expect(() => evaluateRegression(pairs, { predict: () => Infinity })).toThrow(/non-finite/);
  });

  it('默认保留二次拟合，并排除不适用的正值域方法', () => {
    const observations = [-2, -1, 0, 1, 2].map(x => ({ x, y: x * x - 5 }));
    const model = resolveRegression({ kind: 'auto' }).fit(observations);
    expect(model.predict(0.5)).toBeCloseTo(-4.75);
    expect(evaluateRegression(observations, model).rSquared).toBeCloseTo(1);
  });

  it('候选顺序解决并列且获胜模型不重复拟合', () => {
    let fits = 0;
    const definition = defineRegression({ schema: strictObject({ kind: literal('ordered-fit'), offset: number() }) });
    const implementation = defineRegressionImplementation({
      definition,
      fit: (_pairs, operation) => {
        fits += 1;
        return { predict: x => (x === 0 || x === 1 ? 2 : operation.offset) };
      },
    });
    const registry = resolveRegressionRegistry([definition]);
    const model = resolveRegression(
      {
        kind: 'auto',
        candidates: [
          { kind: 'ordered-fit', offset: 7 },
          { kind: 'ordered-fit', offset: 9 },
        ],
      },
      registry,
      resolveRegressionImplementationRegistry(registry, [implementation]),
    ).fit([
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ]);
    expect(model.predict(3)).toBe(7);
    expect(fits).toBe(2);
  });

  it('完整预检候选配置，不把程序异常视为方法不适用', () => {
    expect(() => resolveRegression({ kind: 'auto', candidates: [] })).toThrow();
    expect(() => resolveRegression({ kind: 'auto', candidates: ['linear', 'missing'] })).toThrow(/not registered/);
    expect(() => resolveRegression({ kind: 'auto', candidates: ['auto'] })).toThrow(/auto/);
    const definition = defineRegression({ schema: strictObject({ kind: literal('broken-fit') }) });
    const implementation = defineRegressionImplementation({
      definition,
      fit: () => {
        throw new Error('broken');
      },
    });
    const registry = resolveRegressionRegistry([definition]);
    expect(() =>
      resolveRegression(
        { kind: 'auto', candidates: ['linear', 'broken-fit'] },
        registry,
        resolveRegressionImplementationRegistry(registry, [implementation]),
      ).fit(pairs),
    ).toThrow(/broken/);
    expect(() => resolveRegression({ kind: 'logarithmic' }).fit(pairs)).toThrow(
      expect.objectContaining({ code: RetikzDataErrorCode.RegressionNotApplicable }),
    );
  });
});

const custom = defineRegression({
  schema: strictObject({ kind: literal('custom-fit'), degree: number().int().default(1) }),
});

const customImplementation = defineRegressionImplementation({
  definition: custom,
  fit: (_pairs, operation) => ({ predict: x => x ** operation.degree }),
});
describe('回归注册表', () => {
  it('往返 JSON 方法并解析一次精确的默认值', () => {
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

  it('拒绝缺失、重复和空白注册', () => {
    expect(() => resolveRegression({ kind: 'missing' })).toThrow(/not registered/);
    expect(() => resolveRegressionRegistry([custom, custom])).toThrow(/duplicate/);
    expect(() =>
      resolveRegressionRegistry([defineRegression({ schema: strictObject({ kind: literal('linear') }) })]),
    ).toThrow(/duplicate/);
    expect(() =>
      resolveRegressionRegistry([defineRegression({ schema: strictObject({ kind: literal(' ') }) })]),
    ).toThrow(/non-blank/);
  });

  it('通过同一用户安装内置设备', () => {
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

  it('保留回调原因并拒绝非有限预测', () => {
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

it('为重复组解析一次默认值', () => {
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

describe('自动拟合依赖与适用边界', () => {
  it('显式多项式参与比较，默认集合不偷偷加入它', () => {
    const observations = [-2, -1, 0, 1, 2].map(x => ({ x, y: x ** 3 - 7 }));
    const explicit = resolveRegression({ kind: 'auto', candidates: ['linear', { kind: 'polynomial', order: 3 }] }).fit(
      observations,
    );
    expect(explicit.predict(0.5)).toBeCloseTo(-6.875);
    expect(evaluateRegression(observations, explicit).meanSquaredError).toBeCloseTo(0);
    expect(
      evaluateRegression(observations, resolveRegression({ kind: 'auto' }).fit(observations)).meanSquaredError,
    ).toBeGreaterThan(0.1);
  });

  it('先检查最终预测域，并保留全部排除原因', () => {
    const observations = [1, 2, 4].map(x => ({ x, y: Math.log(x) }));
    const chosen = resolveRegression({ kind: 'auto', candidates: ['logarithmic', 'linear'] }).fit(observations, {
      extent: [-1, 4],
    });
    expect(chosen.predict(3)).toBe(resolveRegression({ kind: 'linear' }).fit(observations).predict(3));
    expect(() =>
      resolveRegression({ kind: 'auto', candidates: ['logarithmic', 'power'] }).fit(observations, { extent: [-1, 4] }),
    ).toThrow(/\[0\] logarithmic.*\[1\] power/);
  });

  it('拒绝间接 auto、组合循环和缺失传递实现', () => {
    const nested = defineRegression({
      schema: strictObject({ kind: literal('nested') }),
      dependencies: () => [{ kind: 'auto' }],
    });
    const cycle = defineRegression({
      schema: strictObject({ kind: literal('cycle') }),
      dependencies: () => [{ kind: 'cycle' }],
    });
    const missing = defineRegression({ schema: strictObject({ kind: literal('missing-implementation') }) });
    const composite = defineRegression({
      schema: strictObject({ kind: literal('composite') }),
      dependencies: () => [{ kind: 'missing-implementation' }],
    });
    const implementation = defineRegressionImplementation({ definition: composite, fit: () => ({ predict: () => 0 }) });
    const registry = resolveRegressionRegistry([nested, cycle, missing, composite]);
    expect(() => resolveRegression({ kind: 'auto', candidates: ['nested'] }, registry)).toThrow(/cyclic/);
    expect(() => resolveRegression({ kind: 'cycle' }, registry)).toThrow(/cyclic/);
    expect(() =>
      resolveRegression(
        { kind: 'auto', candidates: ['linear', 'composite'] },
        registry,
        resolveRegressionImplementationRegistry(registry, [implementation]),
      ),
    ).toThrow(/no local implementation/);
  });

  it('自定义不适用可以排除，但非有限预测与评分仍为致命错误', () => {
    const unavailable = defineRegression({ schema: strictObject({ kind: literal('unavailable') }) });
    const infinite = defineRegression({ schema: strictObject({ kind: literal('infinite-auto') }) });
    const registry = resolveRegressionRegistry([unavailable, infinite]);
    const implementations = resolveRegressionImplementationRegistry(registry, [
      defineRegressionImplementation({
        definition: unavailable,
        fit: () => {
          throw new RetikzDataError('not enough samples', { code: RetikzDataErrorCode.RegressionNotApplicable });
        },
      }),
      defineRegressionImplementation({ definition: infinite, fit: () => ({ predict: () => Infinity }) }),
    ]);
    expect(
      resolveRegression({ kind: 'auto', candidates: ['unavailable', 'linear'] }, registry, implementations)
        .fit(pairs)
        .predict(4),
    ).toBe(9);
    expect(() =>
      resolveRegression({ kind: 'auto', candidates: ['linear', 'infinite-auto'] }, registry, implementations).fit(
        pairs,
      ),
    ).toThrow(/non-finite/);
    expect(() =>
      evaluateRegression(
        [
          { x: 0, y: 1e200 },
          { x: 1, y: -1e200 },
        ],
        { predict: () => 0 },
      ),
    ).toThrow(/non-finite score/);
    const cause = new Error('predict failed');
    expect(() =>
      evaluateRegression(pairs, {
        predict: () => {
          throw cause;
        },
      }),
    ).toThrow(expect.objectContaining({ cause }));
  });
});
