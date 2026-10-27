import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { IRTableCellSelector, SemanticTableCell } from '../../src';
import { defineTableStructure } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { matchesTableCellSelector } from '../../src/pipeline/rule';

const manualModel = () =>
  normalizeTableStructure({
    kind: 'manual',
    rowKinds: ['columnHeader', 'body'],
    rows: [
      [[{ id: 'span', value: 0, span: { columns: 2 } }][0], null],
      [
        { id: 'direct', content: { type: 'node', position: [0, 0], text: 'direct' } },
        { id: 'false-value', value: false },
      ],
    ],
  });

describe('Table Cell 选择器匹配', () => {
  it('在字段内使用成员资格 OR 以及跨规范字段的合取', () => {
    const span = manualModel().cells[0];

    expect(
      matchesTableCellSelector(span, {
        cellIds: ['missing', 'span'],
        rowIndices: [0, 2],
        columnIndices: [0],
        locations: ['columnHeader'],
        roles: { any: ['data', 'columnHeader'], all: ['columnHeader'] },
        sourceKinds: ['manual'],
        payloadKinds: ['value'],
      }),
    ).toBe(true);
    expect(matchesTableCellSelector(span, { cellIds: ['span'], rowIndices: [1] })).toBe(false);
  });

  it('仅通过其原始行和列来匹配跨越 Cell', () => {
    const span = manualModel().cells[0];

    expect(matchesTableCellSelector(span, { columnIds: ['column.0'] })).toBe(false);
    expect(matchesTableCellSelector(span, { columnIndices: [0] })).toBe(true);
    expect(matchesTableCellSelector(span, { columnIds: ['column.1'] })).toBe(false);
    expect(matchesTableCellSelector(span, { columnIndices: [1] })).toBe(false);
  });

  it('仅匹配规范字段源的字段', () => {
    const detail = normalizeTableStructure(
      { kind: 'detail', columns: [{ id: 'score', field: 'score' }] },
      { data: { reference: 'sales' }, datasets: { sales: [{ score: 42 }] } },
    );
    const header = detail.cells[0];
    const body = detail.cells[1];

    expect(matchesTableCellSelector(header, { fields: ['score'] })).toBe(false);
    expect(matchesTableCellSelector(body, { fields: ['score'] })).toBe(true);
    expect(matchesTableCellSelector(body, { fields: ['missing'] })).toBe(false);
  });

  it('将内容单元保留在值谓词否定域之外', () => {
    const cells = manualModel().cells;
    const direct = cells.find(cell => cell.id === 'direct') as SemanticTableCell;
    const falseValue = cells.find(cell => cell.id === 'false-value') as SemanticTableCell;

    expect(matchesTableCellSelector(direct, { payloadKinds: ['content'] })).toBe(true);
    expect(matchesTableCellSelector(falseValue, { payloadKinds: ['value'] })).toBe(true);
    expect(matchesTableCellSelector(direct, { value: { kind: 'equal', value: 0 }, negate: true })).toBe(false);
    expect(matchesTableCellSelector(falseValue, { value: { kind: 'null', isNull: false } })).toBe(true);
  });

  it('在所有非值条件之后应用普通否定', () => {
    const cells = manualModel().cells;
    const span = cells.find(cell => cell.id === 'span') as SemanticTableCell;
    const direct = cells.find(cell => cell.id === 'direct') as SemanticTableCell;

    expect(matchesTableCellSelector(span, { cellIds: ['span'], negate: true })).toBe(false);
    expect(matchesTableCellSelector(direct, { cellIds: ['span'], negate: true })).toBe(true);
  });

  it('区分任何成员资格的角色和所有包含的角色', () => {
    const span = manualModel().cells.find(cell => cell.id === 'span') as SemanticTableCell;

    expect(matchesTableCellSelector(span, { roles: { any: ['data', 'columnHeader'] } })).toBe(true);
    expect(matchesTableCellSelector(span, { roles: { any: ['data'] } })).toBe(false);
    expect(matchesTableCellSelector(span, { roles: { all: ['columnHeader'] } })).toBe(true);
    expect(matchesTableCellSelector(span, { roles: { all: ['columnHeader', 'data'] } })).toBe(false);
  });

  it('保持选择器语义独立于结构提供者', () => {
    const custom = defineTableStructure({
      schema: strictObject({ kind: literal('fixture-structure') }),
      build: () => ({
        rows: [{ id: 'row.0', kind: 'body' }],
        columns: [{ id: 'column.0' }],
        cells: [
          {
            id: 'cell.r0.c0',
            row: 0,
            column: 0,
            payload: { kind: 'value', value: 1 },
            location: 'body',
            roles: ['data'],
            source: { kind: 'generated', structureKind: 'fixture-structure' },
          },
        ],
      }),
    });
    const manual = normalizeTableStructure({ kind: 'manual', rows: [[1]] }).cells[0];
    const generated = normalizeTableStructure({ kind: 'fixture-structure' }, { structureDefinitions: [custom] })
      .cells[0];
    const selectors: Array<IRTableCellSelector> = [
      { rowIndices: [0], columnIndices: [0], locations: ['body'] },
      { roles: { all: ['data'] }, payloadKinds: ['value'] },
      { value: { kind: 'equal', value: 1 } },
    ];

    expect(selectors.map(selector => matchesTableCellSelector(manual, selector))).toEqual(
      selectors.map(selector => matchesTableCellSelector(generated, selector)),
    );
    expect(matchesTableCellSelector(manual, { cellIds: ['cell.r0.c0'] })).toBe(false);
    expect(matchesTableCellSelector(generated, { cellIds: ['cell.r0.c0'] })).toBe(true);
  });
});

describe('Table 原始值谓词匹配', () => {
  it('使用严格的 JSON 标量相等性和成员资格，无需强制', () => {
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 1 }]] }).cells[0], {
        value: { kind: 'equal', value: 1 },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: '1' }]] }).cells[0], {
        value: { kind: 'equal', value: 1 },
      }),
    ).toBe(false);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: false }]] }).cells[0], {
        value: { kind: 'oneOf', values: [0, false, null] },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: '' }]] }).cells[0], {
        value: { kind: 'oneOf', values: [false, 0] },
      }),
    ).toBe(false);
  });

  it('仅比较具有确定性关系语义的相同类型字符串或数字', () => {
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 10 }]] }).cells[0], {
        value: { kind: 'compare', operator: 'gt', value: 2 },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: '10' }]] }).cells[0], {
        value: { kind: 'compare', operator: 'gt', value: 2 },
      }),
    ).toBe(false);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 'ä' }]] }).cells[0], {
        value: { kind: 'compare', operator: 'gt', value: 'z' },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: true }]] }).cells[0], {
        value: { kind: 'compare', operator: 'gt', value: 0 },
      }),
    ).toBe(false);
  });

  it('尊重相等的端点和每个包含边界之间的端点', () => {
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 2 }]] }).cells[0], {
        value: { kind: 'between', min: 2, max: 2 },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 2 }]] }).cells[0], {
        value: { kind: 'between', min: 2, max: 3, includeMin: false },
      }),
    ).toBe(false);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 3 }]] }).cells[0], {
        value: { kind: 'between', min: 2, max: 3, includeMax: false },
      }),
    ).toBe(false);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 'b' }]] }).cells[0], {
        value: { kind: 'between', min: 'a', max: 'c' },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 2 }]] }).cells[0], {
        value: { kind: 'between', min: '1', max: '3' },
      }),
    ).toBe(false);
  });

  it('区分 null 和每个虚假的非 null 标量', () => {
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: null }]] }).cells[0], {
        value: { kind: 'null' },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: null }]] }).cells[0], {
        value: { kind: 'null', isNull: false },
      }),
    ).toBe(false);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: false }]] }).cells[0], {
        value: { kind: 'null', isNull: false },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: 0 }]] }).cells[0], {
        value: { kind: 'null', isNull: false },
      }),
    ).toBe(true);
    expect(
      matchesTableCellSelector(normalizeTableStructure({ kind: 'manual', rows: [[{ value: '' }]] }).cells[0], {
        value: { kind: 'null', isNull: false },
      }),
    ).toBe(true);
  });
});
