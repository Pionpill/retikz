import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import type { ExternalRow, IRDataTransform } from '../../src';
import {
  applyTransforms,
  applyTransformsToDataView,
  createDataView,
  defineTransform,
  defineTransformImplementation,
  readSourceIndex,
  readSourceIndices,
  resolveTransformRegistry,
  RetikzDataError,
  SOURCE_INDEX,
  SOURCE_INDICES,
} from '../../src';

const input: Array<ExternalRow> = [{ value: 3 }, { value: 1 }];
const sort: IRDataTransform = { kind: 'sort', params: { field: 'value' } };

describe('同步变换入口', () => {
  it.each([undefined, false])('为血缘 = %s 的空链保留未触及的输入引用', lineage => {
    const result = applyTransforms(input, [], { lineage });
    expect(result.rows).toBe(input);
    expect(result.lineage).toBeUndefined();
    const view = createDataView(input, [{ name: 'value', type: 'continuous' }]);
    const viewResult = applyTransformsToDataView(view, [], { lineage });
    expect(viewResult.dataView).toBe(view);
    expect(viewResult.lineage).toBeUndefined();
  });

  it.each([
    { provenance: false, recordEvents: false },
    { provenance: true, recordEvents: false },
    { provenance: false, recordEvents: true },
    { provenance: true, recordEvents: true },
  ])('保持来源追溯 = $provenance 独立于事件 = $recordEvents', ({ provenance, recordEvents }) => {
    const result = applyTransforms(input, [sort], {
      provenance,
      lineage: recordEvents,
    });
    expect(result.rows.map(row => row.value)).toEqual([1, 3]);
    expect(result.rows.map(readSourceIndex)).toEqual(provenance ? [1, 0] : [undefined, undefined]);
    expect(input.map(readSourceIndex)).toEqual([undefined, undefined]);
    if (recordEvents) {
      expect(result.lineage?.events.map(event => event.kind)).toEqual(['source', 'transformStep']);
      expect(result.lineage?.events[0]).toMatchObject({
        sourceIdentity: { count: provenance ? 2 : 0, indices: provenance ? [0, 1] : [] },
      });
    } else expect(result.lineage).toBeUndefined();
  });

  it('保留现有的单行和组源，无论来源选项如何', () => {
    const marked = [
      { value: 3, [SOURCE_INDEX]: 8 },
      { value: 1, [SOURCE_INDICES]: [4, 6] },
    ];
    for (const provenance of [false, true]) {
      const { rows } = applyTransforms(marked, [sort], { provenance });
      expect(readSourceIndices(rows[0])).toEqual([4, 6]);
      expect(readSourceIndex(rows[1])).toBe(8);
    }
  });

  it('即使没有转换，也可以应用来源并记录源事件', () => {
    const view = createDataView(input, [{ name: 'value', type: 'continuous' }]);
    const result = applyTransformsToDataView(view, [], { provenance: true, lineage: true });
    expect(result.dataView.rows.map(readSourceIndex)).toEqual([0, 1]);
    expect(result.dataView.model).toEqual(view.model);
    expect(result.lineage?.events.map(event => event.kind)).toEqual(['source']);
    expect(input.map(readSourceIndex)).toEqual([undefined, undefined]);
  });

  it('true 与空配置使用相同的数量限制默认值', () => {
    const rows = Array.from({ length: 21 }, (_, value) => ({ value }));
    const enabled = applyTransforms(rows, [sort], { provenance: true, lineage: true });
    const configured = applyTransforms(rows, [sort], { provenance: true, lineage: {} });
    expect(enabled.lineage?.events).toEqual(configured.lineage?.events);
    expect(enabled.lineage?.events.map(event => event.kind)).toEqual(['source', 'transformStep']);
    expect(enabled.lineage?.events[0]).toMatchObject({
      sourceIdentity: {
        mode: 'summary',
        count: 21,
        indices: Array.from({ length: 20 }, (_, index) => index),
        truncated: true,
      },
    });
  });

  it('通过聚合传播新建立的源，而不记录事件', () => {
    const { rows, lineage } = applyTransforms(
      input,
      [{ kind: 'summarize', params: { metrics: [{ kind: 'sum', field: 'value', as: 'total' }] } }],
      { provenance: true },
    );
    expect(rows[0].total).toBe(4);
    expect(readSourceIndices(rows[0])).toEqual([0, 1]);
    expect(lineage).toBeUndefined();
  });

  it('在保留已传递到接收器的事件的同时引发计算失败', () => {
    const failure = new Error('external computation failed');
    const definition = defineTransform({
      kind: 'failingTransform',
      paramsSchema: object({}),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const implementation = defineTransformImplementation({
      definition,
      apply: () => {
        throw failure;
      },
    });
    const delivered: Array<string> = [];
    expect(() =>
      applyTransforms(input, [{ kind: 'failingTransform', params: {} }], {
        registry: resolveTransformRegistry([definition]),
        transformImplementations: [implementation],
        provenance: true,
        lineage: { sink: event => delivered.push(event.kind) },
      }),
    ).toThrow(RetikzDataError);
    expect(delivered).toEqual(['source']);
  });
});
