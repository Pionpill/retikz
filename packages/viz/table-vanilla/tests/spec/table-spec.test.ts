import { createDetailTableSpec, createManualTableSpec, TableSpecSchema } from '@retikz/table';
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
      rows: 1,
      columns: 1,
      cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value' as const, value: 98 } }],
    };
    const detailBefore = structuredClone(detailInput);
    const manualBefore = structuredClone(manualInput);

    expect(detailTable(detailInput)).toEqual(createDetailTableSpec(detailInput));
    expect(manualTable(manualInput)).toEqual(createManualTableSpec(manualInput));
    expect(detailInput).toEqual(detailBefore);
    expect(manualInput).toEqual(manualBefore);
    expect(TableSpecSchema.parse(detailTable(detailInput))).toEqual(detailTable(detailInput));
    expect(TableSpecSchema.parse(manualTable(manualInput))).toEqual(manualTable(manualInput));
    expect(JSON.parse(JSON.stringify(detailTable(detailInput)))).toEqual(detailTable(detailInput));
  });

  it('returns a standard plain embed spec and rejects an empty id before construction', () => {
    const spec = manualTable({ rows: 1, columns: 1, cells: [] });

    expect(embedTable('panel', spec, { data: {} })).toEqual({
      type: 'embed',
      kind: 'table',
      id: 'panel',
      props: { spec, data: {} },
    });
    expect(() => embedTable('', spec)).toThrow('table vanilla: embed id must be non-empty');
    expect(() => embedTable('   ', spec)).toThrow('table vanilla: embed id must be non-empty');
  });
});
