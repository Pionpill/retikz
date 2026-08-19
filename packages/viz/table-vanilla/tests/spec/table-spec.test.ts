import { RetikzFoundationError } from '@retikz/foundation';
import { createDetailTableIR, createManualTableIR, TableSchema } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import { detailTable, embedTable, manualTable } from '../../src';

describe('Table Vanilla plain authoring', () => {
  it('delegates detail and manual helpers to the shared Table constructors without modifying inputs', () => {
    const detailInput = {
      id: 'people',
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name', header: 'Name' }],
    };
    const manualInput = {
      tableThemeTokens: { 'data.categorical': ['#123456'] },
      encodings: [
        {
          id: 'score',
          selector: { locations: ['body' as const] },
          channel: 'backgroundFill' as const,
          scale: { name: 'ordinal-color', options: { domain: [98], range: ['#123456'] } },
        },
      ],
      rows: [
        ['Name', { value: 98 }],
        [null, { value: null }],
      ],
    };
    const detailBefore = structuredClone(detailInput);
    const manualBefore = structuredClone(manualInput);

    const detailSpec = detailTable(detailInput);
    const manualSpec = manualTable(manualInput);
    expect(detailSpec).toEqual(createDetailTableIR(detailInput));
    expect(manualSpec).toEqual(createManualTableIR(manualInput));
    expect(detailInput).toEqual(detailBefore);
    expect(manualInput).toEqual(manualBefore);
    expect(TableSchema.parse(detailSpec)).toEqual(detailSpec);
    expect(TableSchema.parse(manualSpec)).toEqual(manualSpec);
    expect(JSON.parse(JSON.stringify(detailSpec))).toEqual(detailSpec);
    expect(JSON.parse(JSON.stringify(manualSpec))).toEqual(manualSpec);
  });

  it('returns a standard plain embed spec and rejects an empty id before construction', () => {
    const spec = manualTable({ rows: [[null]] });

    expect(embedTable('panel', spec, { data: {} })).toEqual({
      type: 'embed',
      kind: 'table',
      id: 'panel',
      props: { table: { kind: 'manual', input: { rows: [[null]] } }, data: {} },
    });
    for (const id of ['', '   ', '\u2003', '\ufeff']) {
      expect(() => embedTable(id, spec)).toThrowError(RetikzFoundationError);
      expect(() => embedTable(id, spec)).toThrowError('table vanilla embed id must be a non-empty string.');
    }
  });
});
