import { describe, expect, it } from 'vitest';

import {
  ManualTableStructureSchema,
  TableCellLocation,
  TableCellRole,
  TableRowKind,
  TableStructureKind,
  TableStructureSchema,
} from '../../src';

describe('Table 结构 schema', () => {
  it('输出稳定的内置和预留结构类型', () => {
    expect(TableStructureKind).toEqual({
      Manual: 'manual',
      Detail: 'detail',
      Pivot: 'pivot',
      Matrix: 'matrix',
      Custom: 'custom',
    });
  });

  it('通过 JSON 往返解析手动和详细操作', () => {
    const manual = {
      kind: 'manual',
      rows: [
        [
          'Name',
          {
            value: 'Score',
            presentation: { name: 'text' },
            location: TableCellLocation.ColumnHeader,
            roles: [TableCellRole.ColumnHeader],
          },
        ],
        [null, { content: { type: 'node', position: [0, 0], text: '95' } }],
        [{ value: null }, true],
      ],
      rowKinds: [TableRowKind.ColumnHeader, TableRowKind.Body, TableRowKind.Body],
    };
    const detail = {
      kind: 'detail',
      columns: [
        { id: 'name', field: 'user.name' },
        {
          id: 'score',
          field: 'score',
          header: { kind: 'value', value: 'Score' },
          presentation: { name: 'text' },
        },
      ],
    };

    expect(TableStructureSchema.parse(JSON.parse(JSON.stringify(manual)))).toEqual(manual);
    expect(TableStructureSchema.parse(JSON.parse(JSON.stringify(detail)))).toEqual(detail);
  });

  it('拒绝空的、undefined 的和有漏洞的手动结构', () => {
    const holeyRow = Array<unknown>(1);

    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [[], []] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [[undefined]] })).toThrow();
    expect(() => ManualTableStructureSchema.parse({ kind: 'manual', rows: [holeyRow] })).toThrow();
  });

  it('拒绝参差不齐的行并报告有问题的行路径', () => {
    const result = ManualTableStructureSchema.safeParse({
      kind: 'manual',
      rows: [['A'], ['B', 'C']],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['rows', 1] })]));
    }
  });

  it('拒绝长度与 rowKinds 路径上的行不同的 rowKinds', () => {
    const result = ManualTableStructureSchema.safeParse({
      kind: 'manual',
      rows: [['A'], ['B']],
      rowKinds: ['body'],
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['rowKinds'] })]));
    }
  });

  it('拒绝混合值/内容对象和无效的直接子对象', () => {
    expect(() =>
      ManualTableStructureSchema.parse({ kind: 'manual', rows: [[{ value: 1, content: { type: 'group' } }]] }),
    ).toThrow();
    expect(() =>
      ManualTableStructureSchema.parse({
        kind: 'manual',
        rows: [[{ content: { type: 'group', children: [] }, presentation: { name: 'text' } }]],
      }),
    ).toThrow();
    expect(() =>
      ManualTableStructureSchema.parse({ kind: 'manual', rows: [[{ content: { type: 'unknown-child' } }]] }),
    ).toThrow();
  });

  it('拒绝重复的详细信息列 ID', () => {
    expect(() =>
      TableStructureSchema.parse({
        kind: 'detail',
        columns: [
          { id: 'value', field: 'a' },
          { id: 'value', field: 'b' },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('拒绝仅包含空格的详细信息列 ID 和字段名称', () => {
    expect(TableStructureSchema.safeParse({ kind: 'detail', columns: [{ id: '   ', field: 'score' }] }).success).toBe(
      false,
    );
    expect(TableStructureSchema.safeParse({ kind: 'detail', columns: [{ id: 'score', field: '   ' }] }).success).toBe(
      false,
    );
  });

  it('接受 JSON 安全的自定义操作并拒绝保留类型', () => {
    expect(TableStructureSchema.parse({ kind: 'summaryByRegion', group: 'region' })).toEqual({
      kind: 'summaryByRegion',
      group: 'region',
    });

    for (const kind of ['manual', 'detail', 'pivot', 'matrix', 'custom']) {
      const operation = kind === 'manual' ? { kind } : kind === 'detail' ? { kind } : { kind, value: 1 };

      expect(() => TableStructureSchema.parse(operation)).toThrow();
    }

    expect(() => TableStructureSchema.parse({ kind: 'extension', build: () => [] })).toThrow();
  });
});
