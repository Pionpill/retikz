import type { IRChild } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { TableStructureOutput } from '../../src';
import {
  defineCellPresentation,
  defineTableStructure,
  resolveTableStructureRegistry,
  TableCellLocation,
  TableCellRole,
  TableCellSourceKind,
  TableRowKind,
} from '../../src';
import { presentTable } from '../../src/pipeline/presentation';
import { resolveTableStructure } from '../../src/pipeline/structure';
import { formatDefaultTable } from '../utils/stages';

describe('resolveTableStructure', () => {
  it('输出稳定的源判别字段值', () => {
    expect(TableCellSourceKind).toEqual({ Manual: 'manual', Field: 'field', Generated: 'generated' });
  });

  it('标准化手动单元而不合成身份', () => {
    const model = resolveTableStructure({
      kind: 'manual',
      rows: [
        ['Name', { value: false }],
        [null, { value: null, id: 'null-value' }],
      ],
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body],
    });

    expect(model.rows).toEqual([
      { index: 0, kind: TableRowKind.ColumnHeader },
      { index: 1, kind: TableRowKind.Body },
    ]);
    expect(model.columns).toEqual([{ index: 0 }, { index: 1 }]);
    expect(model.cells).toEqual([
      {
        rowIndex: 0,
        columnIndex: 0,
        location: TableCellLocation.ColumnHeader,
        roles: [TableCellRole.ColumnHeader],
        payload: { kind: 'value', value: 'Name' },
        span: { rows: 1, columns: 1 },
        layout: {
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          horizontalAlign: 'center',
          verticalAlign: 'center',
          wrap: false,
          fit: 'none',
          overflow: 'visible',
        },
        source: { kind: 'manual', row: 0, column: 0 },
      },
      {
        rowIndex: 0,
        columnIndex: 1,
        location: TableCellLocation.ColumnHeader,
        roles: [TableCellRole.ColumnHeader],
        payload: { kind: 'value', value: false },
        span: { rows: 1, columns: 1 },
        layout: {
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          horizontalAlign: 'center',
          verticalAlign: 'center',
          wrap: false,
          fit: 'none',
          overflow: 'visible',
        },
        source: { kind: 'manual', row: 0, column: 1 },
      },
      {
        id: 'null-value',
        rowIndex: 1,
        columnIndex: 1,
        location: TableCellLocation.Body,
        roles: [TableCellRole.Data],
        payload: { kind: 'value', value: null },
        span: { rows: 1, columns: 1 },
        layout: {
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          horizontalAlign: 'center',
          verticalAlign: 'center',
          wrap: false,
          fit: 'none',
          overflow: 'visible',
        },
        source: { kind: 'manual', row: 1, column: 1 },
      },
    ]);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.cells)).toBe(true);
    expect(Object.isFrozen(model.cells[0].payload)).toBe(true);
    expect(Object.isFrozen(model.cells[0].source)).toBe(true);
  });

  it('实现手动标题/正文位置并拒绝语义不匹配', () => {
    const model = resolveTableStructure({
      kind: 'manual',
      rows: [['Name'], ['Ada']],
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body],
    });

    expect(model.cells.map(cell => [cell.location, cell.roles])).toEqual([
      [TableCellLocation.ColumnHeader, [TableCellRole.ColumnHeader]],
      [TableCellLocation.Body, [TableCellRole.Data]],
    ]);
    expect(() =>
      resolveTableStructure({
        kind: 'manual',
        rows: [[{ value: 'Name', location: TableCellLocation.Body, roles: [TableCellRole.Data] }]],
        rowKinds: [TableRowKind.ColumnHeader],
      }),
    ).toThrow(/table: structure "manual"/);
  });

  it('保留全空轨道并拒绝占用的跨度槽、超出范围的跨度和重复的 ID', () => {
    const empty = resolveTableStructure({
      kind: 'manual',
      rows: [
        [null, null],
        [null, null],
      ],
    });

    expect(empty.rows).toHaveLength(2);
    expect(empty.columns).toHaveLength(2);
    expect(empty.cells).toEqual([]);
    expect(() =>
      resolveTableStructure({
        kind: 'manual',
        rows: [[{ value: 1, span: { columns: 2 } }, 2]],
      }),
    ).toThrow(/overlaps/i);
    expect(() => resolveTableStructure({ kind: 'manual', rows: [[{ value: 1, span: { rows: 2 } }]] })).toThrow(
      /span range/i,
    );
    expect(() =>
      resolveTableStructure({
        kind: 'manual',
        rows: [
          [
            { value: 1, id: 'same' },
            { value: 2, id: 'same' },
          ],
        ],
      }),
    ).toThrow(/duplicate.*same/i);
  });

  it('标准化详细信息头部、嵌套字段、标量值和源标识', () => {
    const model = resolveTableStructure(
      {
        kind: 'detail',
        columns: [
          { id: 'name', field: 'user.name' },
          { id: 'score', field: 'score', header: { kind: 'value', value: 'Points' } },
          { id: 'active', field: 'active' },
          { id: 'note', field: 'note' },
        ],
      },
      {
        data: { reference: 'sales' },
        datasets: { sales: [{ user: { name: 'Ada' }, score: 42, active: true, note: null }] },
      },
    );

    expect(model.rows).toEqual([
      { index: 0, kind: TableRowKind.ColumnHeader },
      { index: 1, kind: TableRowKind.Body, sourceIndex: 0 },
    ]);
    expect(model.columns).toEqual([
      { id: 'name', index: 0, field: 'user.name' },
      { id: 'score', index: 1, field: 'score' },
      { id: 'active', index: 2, field: 'active' },
      { id: 'note', index: 3, field: 'note' },
    ]);
    expect(model.cells.map(cell => cell.id)).toEqual(Array.from({ length: 8 }, () => undefined));
    expect(model.cells.map(cell => cell.columnId)).toEqual([
      'name',
      'score',
      'active',
      'note',
      'name',
      'score',
      'active',
      'note',
    ]);
    expect(model.cells[4]).toMatchObject({
      payload: { kind: 'value', value: 'Ada' },
      source: { kind: 'field', reference: 'sales', sourceIndex: 0, field: 'user.name' },
    });
    expect(model.cells[7]).toMatchObject({ payload: { kind: 'value', value: null } });
  });

  it('支持 header false 和无模型的空数据集', () => {
    const withoutHeader = resolveTableStructure(
      { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
      { data: { reference: 'sales' }, datasets: { sales: [{ name: 'Ada' }] } },
    );
    const empty = resolveTableStructure(
      { kind: 'detail', columns: [{ id: 'name', field: 'missing' }] },
      { data: { reference: 'sales' }, datasets: { sales: [] } },
    );

    expect(withoutHeader.rows).toEqual([{ index: 0, kind: 'body', sourceIndex: 0 }]);
    expect(withoutHeader.cells).toHaveLength(1);
    expect(empty.rows).toEqual([{ index: 0, kind: 'columnHeader' }]);
    expect(empty.cells).toHaveLength(1);
  });

  it('由于缺少数据集、严格模型未知字段、缺失值和非标量而失败', () => {
    const detail = { kind: 'detail' as const, columns: [{ id: 'score', field: 'score' }] };

    expect(() => resolveTableStructure(detail)).toThrow(/table: structure "detail"/);
    expect(() => resolveTableStructure(detail, { data: { reference: 'sales' }, datasets: {} })).toThrow(
      /dataset.*sales/i,
    );
    expect(() =>
      resolveTableStructure(detail, {
        data: { reference: 'sales', model: [{ name: 'name' }] },
        datasets: { sales: [] },
      }),
    ).toThrow(/unknown field.*score/i);
    expect(() => resolveTableStructure(detail, { data: { reference: 'sales' }, datasets: { sales: [{}] } })).toThrow(
      /sourceIndex.*0.*score/i,
    );
    expect(() =>
      resolveTableStructure(detail, { data: { reference: 'sales' }, datasets: { sales: [{ score: [42] }] } }),
    ).toThrow(/scalar/i);
  });

  it.each(['toString', '__proto__'])('将继承的数据集名称 %j 视为缺失', reference => {
    const detail = { kind: 'detail' as const, header: false, columns: [{ id: 'value', field: 'value' }] };

    expect(() => resolveTableStructure(detail, { data: { reference }, datasets: {} })).toThrow(
      new RegExp(`dataset.*${reference}`, 'i'),
    );
    expect(
      resolveTableStructure(detail, {
        data: { reference },
        datasets: Object.fromEntries([[reference, [{ value: reference }]]]),
      }).cells[0].payload,
    ).toEqual({ kind: 'value', value: reference });
  });

  it('调度自定义结构并通过规范防护验证其输出', () => {
    const summary = defineTableStructure({
      schema: strictObject({ kind: literal('summary'), label: string() }),
      build: spec => ({
        rows: [{ id: 'row.summary', kind: TableRowKind.Body }],
        columns: [{ id: 'column.summary' }],
        cells: [
          {
            id: 'cell.summary',
            row: 0,
            column: 0,
            payload: { kind: 'value', value: spec.label },
            location: TableCellLocation.Body,
            roles: [TableCellRole.Data],
            source: { kind: 'generated', structureKind: 'summary' },
          },
        ],
      }),
    });
    const model = resolveTableStructure({ kind: 'summary', label: 'Total' }, { structureDefinitions: [summary] });

    expect(model.cells[0]).toMatchObject({
      id: 'cell.summary',
      payload: { kind: 'value', value: 'Total' },
      source: { kind: 'generated', structureKind: 'summary' },
    });

    const invalid = defineTableStructure({
      schema: strictObject({ kind: literal('invalid') }),
      build: () =>
        ({
          rows: [],
          columns: [],
          cells: [],
          mutate: () => undefined,
        }) as unknown as TableStructureOutput,
    });

    expect(() => resolveTableStructure({ kind: 'invalid' }, { structureDefinitions: [invalid] })).toThrow(
      /table: structure "invalid"/,
    );
  });

  it('拒绝丢失、重复、内置和未来保留的结构定义', () => {
    const extension = defineTableStructure({
      schema: strictObject({ kind: literal('extension') }),
      build: () => ({ rows: [], columns: [], cells: [] }),
    });
    const duplicate = defineTableStructure({ ...extension });

    expect(() => resolveTableStructure({ kind: 'missing' })).toThrow(/not registered/i);
    expect(() => resolveTableStructureRegistry([extension, duplicate])).toThrow(/duplicate.*extension/i);

    for (const kind of ['manual', 'detail', 'pivot', 'matrix', 'custom'] as const) {
      const reserved = defineTableStructure({
        schema: strictObject({ kind: literal(kind) }),
        build: () => ({ rows: [], columns: [], cells: [] }),
      });

      expect(() => resolveTableStructureRegistry([reserved])).toThrow(new RegExp(kind, 'i'));
    }
  });

  it('在不更改身份或顺序的情况下呈现分离快照中的规范单元', () => {
    const semantic = resolveTableStructure({
      kind: 'manual',
      rows: [['A', { content: { type: 'node', position: [0, 0] } }]],
    });
    const custom = defineCellPresentation({
      name: 'upper',
      optionsSchema: strictObject({}),
      present: ({ value }) => ({ type: 'node', position: [0, 0], text: String(value).toUpperCase() }),
    });
    const semanticWithCustom = resolveTableStructure({
      kind: 'manual',
      rows: [[{ value: 'custom', presentation: { name: 'upper' } }]],
    });

    const presented = presentTable(formatDefaultTable(semantic));
    const customPresented = presentTable(formatDefaultTable(semanticWithCustom), { presentationDefinitions: [custom] });

    expect(presented.semantic).not.toBe(semantic);
    expect(presented.semantic).toEqual(semantic);
    expect(presented.cells.map(cell => cell.cellId)).toEqual(semantic.cells.map(cell => cell.id));
    expect(presented.cells[0].content).toMatchObject({ text: 'A' });
    expect(presented.cells[1].content).toEqual({ type: 'node', position: [0, 0] });
    expect((customPresented.cells[0].content as IRChild & { text?: string }).text).toBe('CUSTOM');
    expect(Object.isFrozen(presented)).toBe(true);
    expect(Object.isFrozen(presented.cells)).toBe(true);
    expect(Object.isFrozen(presented.cells[0])).toBe(true);
  });
});
