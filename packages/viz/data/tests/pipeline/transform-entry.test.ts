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

describe('synchronous transform entry', () => {
  it.each([undefined, false])('preserves untouched input references for an empty chain with lineage=%s', lineage => {
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
  ])('keeps provenance=$provenance independent from events=$recordEvents', ({ provenance, recordEvents }) => {
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

  it('preserves existing single-row and group sources regardless of the provenance option', () => {
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

  it('applies provenance and records source events even without transforms', () => {
    const view = createDataView(input, [{ name: 'value', type: 'continuous' }]);
    const result = applyTransformsToDataView(view, [], { provenance: true, lineage: true });
    expect(result.dataView.rows.map(readSourceIndex)).toEqual([0, 1]);
    expect(result.dataView.model).toEqual(view.model);
    expect(result.lineage?.events.map(event => event.kind)).toEqual(['source']);
    expect(input.map(readSourceIndex)).toEqual([undefined, undefined]);
  });

  it('uses the same capped defaults for true and an empty configuration', () => {
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

  it('propagates newly established sources through an aggregate without recording events', () => {
    const { rows, lineage } = applyTransforms(
      input,
      [{ kind: 'summarize', params: { metrics: [{ kind: 'sum', field: 'value', as: 'total' }] } }],
      { provenance: true },
    );
    expect(rows[0].total).toBe(4);
    expect(readSourceIndices(rows[0])).toEqual([0, 1]);
    expect(lineage).toBeUndefined();
  });

  it('throws on computation failure while preserving events already delivered to the sink', () => {
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
