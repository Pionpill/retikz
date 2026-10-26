import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { DataView } from '../../src';
import {
  defineTransformImplementation,
  createDataView,
  applyTransformsToDataView,
  DataFieldType,
  defineTransform,
  resolveTransformRegistry,
} from '../../src';

const sourceView = (): DataView =>
  createDataView(
    [{ source: 2, stale: 'old' }],
    [
      { name: 'source', type: DataFieldType.Continuous },
      { name: 'stale', type: DataFieldType.Categorical },
    ],
  );

describe('解决了数据视图转换', () => {
  it.each(['appearance', 'ascending'] as const)(
    '当观察推断连续场时，拒绝 %s 类别顺序',
    order => {
      expect(() => createDataView([{ value: 1 }], [{ name: 'value', order }])).toThrow(/order.*categorical/);
    },
  );

  it('当观察推断分类字段时保留顺序', () => {
    expect(createDataView([{ value: 'M' }], [{ name: 'value', order: ['S', 'M'] }]).model).toEqual([
      { name: 'value', type: 'categorical', order: ['S', 'M'] },
    ]);
  });

  it('保留输入字段证据并添加描述符导出的输出证据', () => {
    const copyField = defineTransform({
      kind: 'copy-field',
      paramsSchema: strictObject({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as, type: { from: operation.params.field } }],
      }),
    });
    const copyFieldImplementation = defineTransformImplementation({
      definition: copyField,
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.params.as]: row[operation.params.field] })),
    });

    const result = applyTransformsToDataView(
      sourceView(),
      [{ kind: 'copy-field', params: { field: 'source', as: 'copy' } }],
      {
        registry: resolveTransformRegistry([copyField]),
        transformImplementations: [copyFieldImplementation],
      },
    ).dataView;

    expect(result.rows).toEqual([{ source: 2, stale: 'old', copy: 2 }]);
    expect(result.model).toEqual([
      { name: 'source', type: DataFieldType.Continuous },
      { name: 'stale', type: DataFieldType.Categorical },
      { name: 'copy', type: DataFieldType.Continuous },
    ]);
  });

  it('重建替换输出映射而不保留陈旧的输入证据', () => {
    const replaceRows = defineTransform({
      kind: 'replace-rows',
      paramsSchema: strictObject({ as: NonBlankStringSchema }),
      outputModel: operation => ({
        kind: 'replace',
        fields: [{ field: operation.params.as, type: DataFieldType.Continuous }],
      }),
    });
    const replaceRowsImplementation = defineTransformImplementation({
      definition: replaceRows,
      apply: (_rows, operation) => [{ [operation.params.as]: 7 }],
    });

    const result = applyTransformsToDataView(sourceView(), [{ kind: 'replace-rows', params: { as: 'value' } }], {
      registry: resolveTransformRegistry([replaceRows]),
      transformImplementations: [replaceRowsImplementation],
    }).dataView;

    expect(result.rows).toEqual([{ value: 7 }]);
    expect(result.model).toEqual([{ name: 'value', type: DataFieldType.Continuous }]);
  });

  it('在执行操作之前拒绝未解析的描述符源', () => {
    let applyCalls = 0;
    const invalidOutput = defineTransform({
      kind: 'invalid-output',
      paramsSchema: strictObject({ as: NonBlankStringSchema }),
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as, type: { from: 'missing' } }],
      }),
    });
    const invalidOutputImplementation = defineTransformImplementation({
      definition: invalidOutput,
      apply: (rows, operation) => {
        applyCalls += 1;
        return rows.map(row => ({ ...row, [operation.params.as]: 1 }));
      },
    });

    expect(
      () =>
        applyTransformsToDataView(sourceView(), [{ kind: 'invalid-output', params: { as: 'value' } }], {
          registry: resolveTransformRegistry([invalidOutput]),
          transformImplementations: [invalidOutputImplementation],
        }).dataView,
    ).toThrow('data: output references unknown field "missing"');
    expect(applyCalls).toBe(0);
  });

  it('替换陈旧的证据并观察显式非类型化输出字段的标量类型', () => {
    const untypedReplace = defineTransform({
      kind: 'untyped-replace',
      paramsSchema: strictObject({}),
      outputModel: () => ({
        kind: 'replace',
        fields: [{ field: 'derived' }],
      }),
    });
    const untypedReplaceImplementation = defineTransformImplementation({
      definition: untypedReplace,
      apply: () => [{ derived: 1 }],
    });

    const result = applyTransformsToDataView(sourceView(), [{ kind: 'untyped-replace', params: {} }], {
      registry: resolveTransformRegistry([untypedReplace]),
      transformImplementations: [untypedReplaceImplementation],
    }).dataView;

    expect(result.rows).toEqual([{ derived: 1 }]);
    expect(result.model).toEqual([{ name: 'derived', type: 'continuous' }]);
  });

  it('从组键和归约器描述符重建汇总字段', () => {
    const view = createDataView(
      [
        { month: 'Jan', revenue: 2 },
        { month: 'Jan', revenue: 3 },
      ],
      [
        { name: 'month', type: DataFieldType.Categorical },
        { name: 'revenue', type: DataFieldType.Continuous },
      ],
    );

    const result = applyTransformsToDataView(view, [
      {
        kind: 'summarize',
        params: {
          groupBy: ['month'],
          metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
        },
      },
    ]).dataView;

    expect(result.rows).toEqual([{ month: 'Jan', totalRevenue: 5 }]);
    expect(result.model).toEqual([
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'totalRevenue', type: DataFieldType.Continuous },
    ]);
  });
});
