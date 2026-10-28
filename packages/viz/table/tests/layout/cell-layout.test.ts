import { resolveBoxSpacing } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { CompiledTableTrackLayout } from '../../src/pipeline/layout';
import {
  computeTableCellBox,
  computeTableCellContentBox,
  computeTableCellOuterSize,
  computeTableCellTranslation,
} from '../../src/pipeline/layout';

const track = (id: string, index: number, offset: number, size: number): CompiledTableTrackLayout => ({
  id,
  index,
  offset,
  size,
});

describe('Table Cell 几何形状', () => {
  it('将解析的填充添加到分配维度，而不读取视觉溢出', () => {
    const allocationBounds = { x: -10, y: 5, width: 30, height: 20 };
    const padding = resolveBoxSpacing({ default: 1, x: 2, left: 4, bottom: 3 }, 0);
    const result = computeTableCellOuterSize(allocationBounds, padding);

    expect(result).toEqual({ width: 36, height: 24 });
    expect(allocationBounds).toEqual({ x: -10, y: 5, width: 30, height: 20 });
    expect(padding).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('计算具有内部间隙的单轨和跨越框', () => {
    const rows = [track('r0', 0, 0, 5), track('r1', 1, 8, 7)];
    const columns = [track('c0', 0, 0, 10), track('c1', 1, 12, 20), track('c2', 2, 34, 30)];

    expect(
      computeTableCellBox({
        rows,
        columns,
        rowIndex: 0,
        columnIndex: 0,
        rowSpan: 1,
        columnSpan: 1,
        rowGap: 3,
        columnGap: 2,
      }),
    ).toEqual({ x: 0, y: 0, width: 10, height: 5 });
    expect(
      computeTableCellBox({
        rows,
        columns,
        rowIndex: 0,
        columnIndex: 1,
        rowSpan: 2,
        columnSpan: 2,
        rowGap: 3,
        columnGap: 2,
      }),
    ).toEqual({ x: 12, y: 0, width: 52, height: 15 });
  });

  it('缩小内容框并将 Cell 框内的过度填充夹紧到零大小', () => {
    expect(
      computeTableCellContentBox({ x: 10, y: 20, width: 30, height: 20 }, { top: 3, right: 6, bottom: 7, left: 4 }),
    ).toEqual({ x: 14, y: 23, width: 20, height: 10 });
    expect(
      computeTableCellContentBox({ x: 10, y: 20, width: 10, height: 8 }, { top: 9, right: 3, bottom: 4, left: 12 }),
    ).toEqual({ x: 20, y: 28, width: 0, height: 0 });
  });

  it.each([
    ['start', 'start', { x: 120, y: 190 }],
    ['center', 'center', { x: 150, y: 205 }],
    ['end', 'end', { x: 180, y: 220 }],
    ['start', 'end', { x: 120, y: 220 }],
  ] as const)('将实际分配边界与 %s/%s 锚点对齐', (horizontalAlign, verticalAlign, expected) => {
    expect(
      computeTableCellTranslation({
        contentBox: { x: 100, y: 200, width: 80, height: 40 },
        allocationBounds: { x: -20, y: 10, width: 20, height: 10 },
        horizontalAlign,
        verticalAlign,
      }),
    ).toEqual(expected);
  });

  it('返回分离的不可变几何体，而不改变输入', () => {
    const rows = [track('r0', 0, 4, 10)];
    const columns = [track('c0', 0, 6, 20)];
    const input = {
      rows,
      columns,
      rowIndex: 0,
      columnIndex: 0,
      rowSpan: 1,
      columnSpan: 1,
      rowGap: 0,
      columnGap: 0,
    };
    const snapshot = structuredClone(input);
    const first = computeTableCellBox(input);
    const second = computeTableCellBox(input);

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(input).toEqual(snapshot);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it.each([
    [() => computeTableCellOuterSize({ x: 0, y: 0, width: -1, height: 1 }, resolveBoxSpacing(0, 0)), /width/i],
    [
      () => computeTableCellOuterSize({ x: Number.NaN, y: 0, width: 1, height: 1 }, resolveBoxSpacing(0, 0)),
      /allocationBounds/i,
    ],
    [
      () => computeTableCellContentBox({ x: 0, y: 0, width: 1, height: 1 }, { top: -1, right: 0, bottom: 0, left: 0 }),
      /padding/i,
    ],
    [
      () =>
        computeTableCellBox({
          rows: [track('r0', 0, 0, 1)],
          columns: [track('c0', 0, 0, 1)],
          rowIndex: 0,
          columnIndex: 0,
          rowSpan: 0,
          columnSpan: 1,
          rowGap: 0,
          columnGap: 0,
        }),
      /rowSpan/i,
    ],
    [
      () =>
        computeTableCellBox({
          rows: [track('r0', 0, 0, 1)],
          columns: [track('c0', 0, 0, 1)],
          rowIndex: 0,
          columnIndex: 1,
          rowSpan: 1,
          columnSpan: 1,
          rowGap: 0,
          columnGap: 0,
        }),
      /column.*range/i,
    ],
  ])('拒绝无效的 Cell 几何输入 %#', (run, message) => {
    expect(run).toThrow(message);
  });
});
