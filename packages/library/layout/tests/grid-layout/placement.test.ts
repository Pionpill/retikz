import { describe, expect, it } from 'vitest';

import { GRID_LAYOUT_MAX_TRACKS_PER_AXIS, GridAutoFlow, GridOverlap } from '../../src';
import { resolveGridPlacements } from '../../src/composites/grid-layout/placement';

const item = (
  key: string,
  options: Partial<{
    column: Readonly<{ start: number; span: number }>;
    row: Readonly<{ start: number; span: number }>;
  }> = {},
) => ({ key, sourceIndex: Number(key.replace(/\D/g, '')), ...options });

describe('GridLayout 布局解算器', () => {
  it('按分阶段编写顺序放置完全显式、部分和自动项目', () => {
    const result = resolveGridPlacements(
      [
        item('item-0', { column: { start: 1, span: 1 }, row: { start: 0, span: 1 } }),
        item('item-1', { row: { start: 0, span: 1 } }),
        item('item-2', { column: { start: 0, span: 1 } }),
        item('item-3'),
      ],
      { explicitColumns: 2, explicitRows: 0, autoFlow: GridAutoFlow.Row, overlap: GridOverlap.Reject },
    );

    expect(result).toEqual({
      columnCount: 2,
      rowCount: 2,
      items: [
        { key: 'item-0', sourceIndex: 0, columnStart: 1, columnSpan: 1, rowStart: 0, rowSpan: 1 },
        { key: 'item-1', sourceIndex: 1, columnStart: 0, columnSpan: 1, rowStart: 0, rowSpan: 1 },
        { key: 'item-2', sourceIndex: 2, columnStart: 0, columnSpan: 1, rowStart: 1, rowSpan: 1 },
        { key: 'item-3', sourceIndex: 3, columnStart: 1, columnSpan: 1, rowStart: 1, rowSpan: 1 },
      ],
    });
  });

  it('将部分扫描与全自动游标分开，并支持无行列流', () => {
    const rowFlow = resolveGridPlacements(
      [
        item('item-0', { column: { start: 1, span: 1 }, row: { start: 0, span: 1 } }),
        item('item-1', { column: { start: 0, span: 2 } }),
        item('item-2'),
      ],
      { explicitColumns: 3, explicitRows: 1, autoFlow: GridAutoFlow.Row, overlap: GridOverlap.Reject },
    );
    const columnFlow = resolveGridPlacements([item('item-0'), item('item-1'), item('item-2')], {
      explicitColumns: 1,
      explicitRows: 0,
      autoFlow: GridAutoFlow.Column,
      overlap: GridOverlap.Reject,
    });

    expect(rowFlow.items.map(value => [value.rowStart, value.columnStart])).toEqual([
      [0, 1],
      [1, 0],
      [0, 0],
    ]);
    expect(columnFlow.items.map(value => [value.rowStart, value.columnStart])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it('仅允许完全显式编写的重叠并保持其他项目无冲突', () => {
    const items = [
      item('item-0', { column: { start: 0, span: 1 }, row: { start: 0, span: 1 } }),
      item('item-1', { column: { start: 0, span: 1 }, row: { start: 0, span: 1 } }),
      item('item-2', { row: { start: 0, span: 1 } }),
    ];

    expect(() =>
      resolveGridPlacements(items, {
        explicitColumns: 1,
        explicitRows: 1,
        autoFlow: GridAutoFlow.Row,
        overlap: GridOverlap.Reject,
      }),
    ).toThrow(/item-1.*overlap/i);
    expect(
      resolveGridPlacements(items, {
        explicitColumns: 1,
        explicitRows: 1,
        autoFlow: GridAutoFlow.Row,
        overlap: GridOverlap.Allow,
      }).items.map(value => [value.key, value.rowStart, value.columnStart]),
    ).toEqual([
      ['item-0', 0, 0],
      ['item-1', 0, 0],
      ['item-2', 0, 1],
    ]);
  });

  it('在扩展或实现之前保护每个明确的结束', () => {
    expect(
      resolveGridPlacements(
        [
          item('item-0', {
            column: { start: GRID_LAYOUT_MAX_TRACKS_PER_AXIS - 1, span: 1 },
            row: { start: 0, span: 1 },
          }),
        ],
        { explicitColumns: 1, explicitRows: 1, autoFlow: GridAutoFlow.Row, overlap: GridOverlap.Reject },
      ).columnCount,
    ).toBe(GRID_LAYOUT_MAX_TRACKS_PER_AXIS);

    for (const column of [
      { start: GRID_LAYOUT_MAX_TRACKS_PER_AXIS - 1, span: 2 },
      { start: GRID_LAYOUT_MAX_TRACKS_PER_AXIS, span: 1 },
      { start: Number.MAX_SAFE_INTEGER, span: 1 },
    ]) {
      expect(() =>
        resolveGridPlacements([item('item-0', { column, row: { start: 0, span: 1 } })], {
          explicitColumns: 1,
          explicitRows: 1,
          autoFlow: GridAutoFlow.Row,
          overlap: GridOverlap.Reject,
        }),
      ).toThrow(/item-0.*column/i);
    }
  });

  it('在第一个需要第 10,001 个轨道的全自动项目上失败', () => {
    const items = Array.from({ length: GRID_LAYOUT_MAX_TRACKS_PER_AXIS + 1 }, (_, index) => item(`item-${index}`));

    expect(() =>
      resolveGridPlacements(items, {
        explicitColumns: 1,
        explicitRows: 0,
        autoFlow: GridAutoFlow.Column,
        overlap: GridOverlap.Reject,
      }),
    ).toThrow(/item-10000.*column/i);
  });

  it('保留自动轴跨度并将非密集光标推进到整个区域', () => {
    const result = resolveGridPlacements(
      [
        { key: 'item-0', sourceIndex: 0, column: { span: 2 }, row: { span: 1 } },
        { key: 'item-1', sourceIndex: 1, column: { span: 1 }, row: { span: 1 } },
      ],
      {
        explicitColumns: 2,
        explicitRows: 1,
        autoFlow: GridAutoFlow.Row,
        overlap: GridOverlap.Reject,
      },
    );

    expect(result.items).toEqual([
      { key: 'item-0', sourceIndex: 0, columnStart: 0, columnSpan: 2, rowStart: 0, rowSpan: 1 },
      { key: 'item-1', sourceIndex: 1, columnStart: 0, columnSpan: 1, rowStart: 1, rowSpan: 1 },
    ]);
  });

  it('扩展列流跨度的种子行并前进到整个区域', () => {
    const result = resolveGridPlacements(
      [
        { key: 'item-0', sourceIndex: 0, column: { span: 1 }, row: { span: 2 } },
        { key: 'item-1', sourceIndex: 1, column: { span: 1 }, row: { span: 1 } },
      ],
      {
        explicitColumns: 1,
        explicitRows: 0,
        autoFlow: GridAutoFlow.Column,
        overlap: GridOverlap.Reject,
      },
    );

    expect(result).toEqual({
      columnCount: 2,
      rowCount: 2,
      items: [
        { key: 'item-0', sourceIndex: 0, columnStart: 0, columnSpan: 1, rowStart: 0, rowSpan: 2 },
        { key: 'item-1', sourceIndex: 1, columnStart: 1, columnSpan: 1, rowStart: 0, rowSpan: 1 },
      ],
    });
  });
});
