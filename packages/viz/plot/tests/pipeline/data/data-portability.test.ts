import { compileToScene } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import {
  applyTransforms,
  coerceValue,
  defineTransform,
  normalizeRows,
  resolveFieldPath,
  DataFieldType,
  readSourceIndex,
  tagSourceIndex,
  resolveTransformRegistry,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import { createPlotLocator } from '../../../src/pipeline';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlots } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

/** 跑一次完整下沉（抛错路径用 expect(fn).toThrow） */
const compile = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>, options?: LowerPlotsOptions) =>
  compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, options) }).scene;

const specWithModel = (reference = 'd'): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference,
      model: [
        { name: 'month', type: 'temporal' },
        { name: 'revenue', type: 'continuous' },
      ],
    },
    scales: [
      { type: 'time', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'path', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

const specNoModel = (reference = 'd'): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } }],
  });

/** 构造仅含指定自有键的字典，避免 `__proto__` 对对象字面量的特殊语义 */
const ownRecord = <T>(key: string, value: T): Record<string, T> => {
  const record = Object.create(null) as Record<string, T>;
  Object.defineProperty(record, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });

  return record;
};

/** 构造仅从原型继承指定键的字典 */
const inheritedRecord = <T>(key: string, value: T): Record<string, T> =>
  Object.create(ownRecord(key, value)) as Record<string, T>;

const doubleDefinition = defineTransform({
  kind: 'double',
  paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const doubleDefinitionImplementation = defineTransformImplementation({
  definition: doubleDefinition,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.params.as]: Number(row[operation.params.field]) * 2,
    })),
});

describe('coerceValue — 按 DataFieldType 值强制（contract）', () => {
  it('连续数字和严格字符串', () => {
    expect(coerceValue(120, DataFieldType.Continuous)).toBe(120);
    expect(coerceValue('120', DataFieldType.Continuous)).toBe(120);
    expect(coerceValue(' 1.5e3 ', DataFieldType.Continuous)).toBe(1500);
  });

  it('连续类型拒绝含无效内容的字符串', () => {
    for (const bad of ['', '12px', '0xFF', 'Infinity', 'NaN', 'abc']) {
      expect(Number.isNaN(coerceValue(bad, DataFieldType.Continuous) as number)).toBe(true);
    }

    expect(Number.isNaN(coerceValue({}, DataFieldType.Continuous) as number)).toBe(true);
  });

  it('连续类型保留负数及大于 1 的数值', () => {
    expect(coerceValue(1.5, DataFieldType.Continuous)).toBe(1.5);
    expect(coerceValue('-0.2', DataFieldType.Continuous)).toBe(-0.2);
  });

  it('时间接受日期 iso 纪元', () => {
    const expected = Date.parse('2024-01-01');

    expect(coerceValue('2024-01-01', DataFieldType.Temporal)).toBe(expected);
    expect(coerceValue(new Date('2024-01-01'), DataFieldType.Temporal)).toBe(expected);
    expect(coerceValue(expected, DataFieldType.Temporal)).toBe(expected);
  });

  it('时间无效为 nan', () => {
    expect(Number.isNaN(coerceValue('2024/01/01', DataFieldType.Temporal) as number)).toBe(true);
    expect(Number.isNaN(coerceValue('abc', DataFieldType.Temporal) as number)).toBe(true);
  });

  it('分类保留字符串或数字', () => {
    expect(coerceValue('north', DataFieldType.Categorical)).toBe('north');
    expect(coerceValue(3, DataFieldType.Categorical)).toBe(3);
    expect(coerceValue({}, DataFieldType.Categorical)).toBeUndefined();
  });
});

describe('normalizeRows — ingest 归一化（contract）', () => {
  const fieldTypeMap = new Map([
    ['month', DataFieldType.Temporal],
    ['revenue', DataFieldType.Continuous],
  ]);

  it('身份强制到位', () => {
    const out = normalizeRows([{ month: '2024-01-01', revenue: '120' }], fieldTypeMap);

    expect(out[0].month).toBe(Date.parse('2024-01-01'));
    expect(out[0].revenue).toBe(120);
  });

  it('字段映射重命名然后强制', () => {
    const out = normalizeRows([{ period: '2024-01-01', amount: '90' }], fieldTypeMap, {
      month: 'period',
      revenue: 'amount',
    });

    expect(out[0].month).toBe(Date.parse('2024-01-01'));
    expect(out[0].revenue).toBe(90);
  });

  it('嵌套物理路径通过字段映射', () => {
    const out = normalizeRows([{ pricing: { amount: 42 } }], new Map([['revenue', DataFieldType.Continuous]]), {
      revenue: 'pricing.amount',
    });

    expect(out[0].revenue).toBe(42);
  });

  it('嵌套逻辑路径强制', () => {
    // 点路径逻辑名归一化写扁平 key，下游 resolveFieldPath exact-first 命中 coerced 值（不再读回原始嵌套字符串）
    const out = normalizeRows([{ user: { age: '42' } }], new Map([['user.age', DataFieldType.Continuous]]));

    expect(out[0]['user.age']).toBe(42);
    expect(resolveFieldPath(out[0], 'user.age')).toBe(42);
  });

  it('保留源索引', () => {
    const tagged = tagSourceIndex([{ revenue: '5' }, { revenue: '7' }]);
    const out = normalizeRows(tagged, new Map([['revenue', DataFieldType.Continuous]]));

    expect(readSourceIndex(out[1])).toBe(1);
    expect(out[1].revenue).toBe(7);
  });
});

describe('coerce-before-transform 关键回归', () => {
  it('数字字符串堆栈正确', () => {
    // 数字串先归一化成数值，再 stack 累加 → 得 8 而非 0
    const normalized = normalizeRows(
      [
        { m: 'Q1', v: '3' },
        { m: 'Q1', v: '5' },
      ],
      new Map([['v', DataFieldType.Continuous]]),
    );
    const stacked = applyTransforms(normalized, [{ kind: 'stack', params: { x: 'm', y: 'v' } }], {
      registry: resolveTransformRegistry(),
    }).rows;

    expect(stacked[1]).toMatchObject({ y0: 3, y1: 8 });
  });
});

describe('数据字典 own-key 语义（contract 集成）', () => {
  it.each(['constructor', 'toString', '__proto__'])('继承的数据集键 %s 被视为缺失', reference => {
    expect(() => compile(specNoModel(reference), {})).toThrow(
      `lowerPlots: dataset "${reference}" not found in provided datasets`,
    );

    expect(() => createPlotLocator(specNoModel(reference), {}, { environment: {} })).not.toThrow();
    expect(createPlotLocator(specNoModel(reference), {}, { environment: {} }).datum(0)).toBeNull();
  });

  it.each(['constructor', 'toString', '__proto__'])('自己的数据集键 %s 仍然可用', reference => {
    const datasets = ownRecord(reference, [{ a: 1, b: 2 }]);

    expect(() => compile(specNoModel(reference), datasets)).not.toThrow();
    expect(createPlotLocator(specNoModel(reference), datasets, { environment: {} }).datum(0)).not.toBeNull();
  });

  it.each(['constructor', 'toString', '__proto__'])('继承的 datasetFieldMaps 键 %s 被忽略', reference => {
    const datasets = ownRecord(reference, [{ month: '2024-01-01', revenue: 1 }]);
    const datasetFieldMaps = inheritedRecord(reference, { month: 'missingMonth', revenue: 'missingRevenue' });

    expect(() => compile(specWithModel(reference), datasets, { datasetFieldMaps })).not.toThrow();
    expect(
      createPlotLocator(specWithModel(reference), datasets, { environment: {}, datasetFieldMaps }).datum(0),
    ).not.toBeNull();
  });

  it.each(['constructor', 'toString', '__proto__'])(
    '自己的 datasetFieldMaps 键 %s 无法定位继承的数据集',
    reference => {
      const datasetFieldMaps = ownRecord(reference, { month: 'period' });

      expect(() =>
        compile(specWithModel(), { d: [{ month: '2024-01-01', revenue: 1 }] }, { datasetFieldMaps }),
      ).toThrow(`lowerPlots: datasetFieldMaps references unknown dataset "${reference}"`);
    },
  );

  it.each(['constructor', 'toString', '__proto__'])('自己的 datasetFieldMaps 键 %s 仍然可用', reference => {
    const datasets = ownRecord(reference, [{ period: '2024-01-01', amount: 1 }]);
    const datasetFieldMaps = ownRecord(reference, { month: 'period', revenue: 'amount' });

    expect(() => compile(specWithModel(reference), datasets, { datasetFieldMaps })).not.toThrow();
    expect(
      createPlotLocator(specWithModel(reference), datasets, { environment: {}, datasetFieldMaps }).datum(0),
    ).not.toBeNull();
  });

  it('没有模型抛出的字段图', () => {
    expect(() => compile(specNoModel(), { d: [{ a: 1, b: 2 }] }, { datasetFieldMaps: { d: { a: 'x' } } })).toThrow(
      /requires data\.model/i,
    );
  });

  it('fieldmap 引用未知逻辑字段时抛出错误', () => {
    expect(() =>
      compile(
        specWithModel(),
        { d: [{ month: '2024-01-01', revenue: 1 }] },
        { datasetFieldMaps: { d: { nope: 'x' } } },
      ),
    ).toThrow(/unknown logical field/i);
  });

  it('字段映射未知数据集抛出', () => {
    expect(() =>
      compile(
        specWithModel(),
        { d: [{ month: '2024-01-01', revenue: 1 }] },
        { datasetFieldMaps: { other: { month: 'x' } } },
      ),
    ).toThrow(/unknown dataset/i);
  });

  it('身份交换相同模型编译', () => {
    // 同名同类型换源（恒等）→ 正常下沉，不抛
    expect(() =>
      compile(specWithModel(), {
        d: [
          { month: '2024-01-01', revenue: 10 },
          { month: '2024-02-01', revenue: 14 },
        ],
      }),
    ).not.toThrow();
  });

  it('字段映射重命名编译', () => {
    const renamed = compile(
      specWithModel(),
      { d: [{ period: '2024-01-01', amount: 10 }] },
      { datasetFieldMaps: { d: { month: 'period', revenue: 'amount' } } },
    );

    expect(renamed).toBeTruthy();
  });
});

describe('validateData（契约）', () => {
  it('默认关闭，缺失字段不抛出', () => {
    // 默认不校验绑定数据：字段缺失只是空图，不抛
    expect(() => compile(specWithModel(), { d: [{ wrong: 1 }] })).not.toThrow();
  });

  it('启用检查时字段缺失会抛出错误', () => {
    expect(() => compile(specWithModel(), { d: [{ wrong: 1 }] }, { validateData: true })).toThrow(/no valid values/i);
  });
});

describe('定位器 datasetFieldMaps 等价性', () => {
  it('定位器构建像渲染一样抛出', () => {
    // 同 spec+options：render 抛 unknown logical field → locator build 也抛（不再静默返回结果）
    expect(() =>
      createPlotLocator(
        specWithModel(),
        { d: [{ month: '2024-01-01', revenue: 1 }] },
        { environment: {}, datasetFieldMaps: { d: { nope: 'x' } } },
      ),
    ).toThrow(/unknown logical field/i);
  });

  it('定位器构建抛出没有模型的字段图', () => {
    expect(() =>
      createPlotLocator(
        specNoModel(),
        { d: [{ a: 1, b: 2 }] },
        { environment: {}, datasetFieldMaps: { d: { a: 'x' } } },
      ),
    ).toThrow(/requires data\.model/i);
  });
});

describe('自定义变换数据可移植性（契约）', () => {
  const customSpec = (): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'x', type: 'continuous' },
          { name: 'y', type: 'continuous' },
        ],
      },
      transform: [{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x2' }, y: { field: 'y' } } } }],
    });

  it('严格模型接受注册自定义输出字段', () => {
    expect(() =>
      compile(
        customSpec(),
        { d: [{ x: 2, y: 5 }] },
        {
          definitions: { transforms: [doubleDefinition] },
          implementations: { transforms: [doubleDefinitionImplementation] },
        },
      ),
    ).not.toThrow();
  });

  it('严格模型拒绝未注册自定义输出字段', () => {
    const missingOutputDefinition = defineTransform({
      kind: 'double',
      paramsSchema: doubleDefinition.schema.shape.params,
      inputFields: operation => [operation.params.field],
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const missingOutputDefinitionImplementation = defineTransformImplementation({
      definition: missingOutputDefinition,
      apply: doubleDefinitionImplementation.apply,
    });

    expect(() =>
      compile(
        customSpec(),
        { d: [{ x: 2, y: 5 }] },
        {
          definitions: { transforms: [missingOutputDefinition] },
          implementations: { transforms: [missingOutputDefinitionImplementation] },
        },
      ),
    ).toThrow(/x2/);
  });
});
