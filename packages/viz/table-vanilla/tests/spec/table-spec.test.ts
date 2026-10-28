import { createDetailTableIR, createManualTableIR, TableSchema } from '@retikz/table';
import { describe, expect, it } from 'vitest';

import { detailTable, embedTable, manualTable } from '../../src';

describe('Table Vanilla 简单编写', () => {
  it('detail 和 manual 辅助函数委托共享 Table 构造器且不修改输入', () => {
    const detailInput = {
      id: 'people',
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name', header: 'Name' }],
    };
    const manualInput = {
      defaultVisual: { categorical: ['#123456'] },
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

  it('保留匿名 Source 并重用嵌入的显式 Source id', () => {
    const spec = manualTable({ rows: [[null]] });

    expect(embedTable(spec, { data: {} })).toEqual({
      type: 'embed',
      kind: 'table',
      props: { table: { kind: 'manual', input: { rows: [[null]] } }, data: {} },
    });

    const named = manualTable({ id: 'panel', rows: [[null]] });

    expect(embedTable(named)).toMatchObject({ id: 'panel', props: { table: { input: { id: 'panel' } } } });
    expect(spec).not.toHaveProperty('id');
  });
});
