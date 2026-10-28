import { describe, expect, it } from 'vitest';

import { computeTableCellContentPlacement, computeTableCellFitScale } from '../../src/pipeline/layout';

describe('Table Cell 内容政策', () => {
  it('不保留任何内容作为标识并计算包含、覆盖和拉伸比例', () => {
    const source = { x: -10, y: 5, width: 20, height: 10 };
    const target = { x: 100, y: 50, width: 30, height: 30 };

    expect(computeTableCellFitScale(source, target, 'none')).toEqual({ x: 1, y: 1 });
    expect(computeTableCellFitScale(source, target, 'contain')).toEqual({ x: 1.5, y: 1.5 });
    expect(computeTableCellFitScale(source, target, 'cover')).toEqual({ x: 3, y: 3 });
    expect(computeTableCellFitScale(source, target, 'stretch')).toEqual({ x: 1.5, y: 3 });
  });

  it('允许包含和覆盖放大或缩小，同时保持纵横比', () => {
    const source = { x: 0, y: 0, width: 20, height: 10 };

    expect(computeTableCellFitScale(source, { x: 0, y: 0, width: 40, height: 40 }, 'contain')).toEqual({
      x: 2,
      y: 2,
    });
    expect(computeTableCellFitScale(source, { x: 0, y: 0, width: 5, height: 4 }, 'cover')).toEqual({
      x: 0.4,
      y: 0.4,
    });
  });

  it('源轴和目标轴为零时不产生除法异常结果', () => {
    const verticalSource = { x: 3, y: 4, width: 0, height: 10 };
    const target = { x: 20, y: 30, width: 30, height: 20 };

    expect(computeTableCellFitScale(verticalSource, target, 'contain')).toEqual({ x: 2, y: 2 });
    expect(computeTableCellFitScale(verticalSource, target, 'cover')).toEqual({ x: 2, y: 2 });
    expect(computeTableCellFitScale(verticalSource, target, 'stretch')).toEqual({ x: 1, y: 2 });
    expect(computeTableCellFitScale({ x: 3, y: 4, width: 0, height: 0 }, target, 'contain')).toEqual({ x: 1, y: 1 });
    expect(computeTableCellFitScale({ x: 3, y: 4, width: 0, height: 0 }, target, 'cover')).toEqual({ x: 1, y: 1 });
    expect(
      computeTableCellFitScale({ x: 0, y: 0, width: 20, height: 10 }, { x: 0, y: 0, width: 0, height: 30 }, 'contain'),
    ).toEqual({ x: 0, y: 0 });
    expect(
      computeTableCellFitScale({ x: 0, y: 0, width: 20, height: 10 }, { x: 0, y: 0, width: 0, height: 30 }, 'cover'),
    ).toEqual({ x: 3, y: 3 });
  });

  it('在边界感知中心对齐之前围绕回放根原点进行缩放', () => {
    const result = computeTableCellContentPlacement({
      sourceAllocationBounds: { x: -10, y: 5, width: 20, height: 10 },
      sourceVisualOverflowBounds: { x: -12, y: 3, width: 24, height: 14 },
      contentBox: { x: 100, y: 50, width: 60, height: 30 },
      horizontalAlign: 'center',
      verticalAlign: 'center',
      fit: 'contain',
      overflow: 'visible',
    });

    expect(result).toEqual({
      scale: { x: 3, y: 3 },
      translation: { x: 130, y: 35 },
      contentAllocationBounds: { x: 100, y: 50, width: 60, height: 30 },
      visualOverflowBounds: { x: 94, y: 44, width: 72, height: 42 },
      replayContent: true,
    });
  });

  it('根据缩放分配最大锚点计算末端对齐', () => {
    const result = computeTableCellContentPlacement({
      sourceAllocationBounds: { x: 10, y: -5, width: 20, height: 10 },
      sourceVisualOverflowBounds: { x: 10, y: -5, width: 20, height: 10 },
      contentBox: { x: 100, y: 50, width: 40, height: 30 },
      horizontalAlign: 'end',
      verticalAlign: 'end',
      fit: 'stretch',
      overflow: 'visible',
    });

    expect(result.scale).toEqual({ x: 2, y: 3 });
    expect(result.translation).toEqual({ x: 80, y: 65 });
    expect(result.contentAllocationBounds).toEqual({ x: 100, y: 50, width: 40, height: 30 });
  });

  it('裁剪 Table 局部坐标中变换后的视觉溢出', () => {
    const result = computeTableCellContentPlacement({
      sourceAllocationBounds: { x: -10, y: 5, width: 20, height: 10 },
      sourceVisualOverflowBounds: { x: -12, y: 3, width: 24, height: 14 },
      contentBox: { x: 100, y: 50, width: 60, height: 30 },
      horizontalAlign: 'center',
      verticalAlign: 'center',
      fit: 'contain',
      overflow: 'clip',
    });

    expect(result.clipBounds).toEqual({ x: 100, y: 50, width: 60, height: 30 });
    expect(result.visualOverflowBounds).toEqual({ x: 100, y: 50, width: 60, height: 30 });
    expect(result.replayContent).toBe(true);
  });

  it('当剪切的视觉边界不相交时，返回确定性零区域交集', () => {
    const result = computeTableCellContentPlacement({
      sourceAllocationBounds: { x: 100, y: 50, width: 60, height: 30 },
      sourceVisualOverflowBounds: { x: 0, y: 0, width: 10, height: 10 },
      contentBox: { x: 100, y: 50, width: 60, height: 30 },
      horizontalAlign: 'start',
      verticalAlign: 'start',
      fit: 'none',
      overflow: 'clip',
    });

    expect(result.visualOverflowBounds).toEqual({ x: 100, y: 50, width: 0, height: 0 });
    expect(result.replayContent).toBe(true);
  });

  it.each([
    [
      { x: 20, y: 2, width: 5, height: 5 },
      { x: 10, y: 2, width: 0, height: 5 },
    ],
    [
      { x: 2, y: 20, width: 5, height: 5 },
      { x: 2, y: 10, width: 5, height: 0 },
    ],
  ])('在 %# 的内容框边界上保留一轴空裁剪交叉点', (visualBounds, expected) => {
    const result = computeTableCellContentPlacement({
      sourceAllocationBounds: { x: 0, y: 0, width: 10, height: 10 },
      sourceVisualOverflowBounds: visualBounds,
      contentBox: { x: 0, y: 0, width: 10, height: 10 },
      horizontalAlign: 'start',
      verticalAlign: 'start',
      fit: 'none',
      overflow: 'clip',
    });

    expect(result.visualOverflowBounds).toEqual(expected);
  });

  it('将零轴裁剪框变成没有无效裁剪的空可见内容', () => {
    const input: Parameters<typeof computeTableCellContentPlacement>[0] = {
      sourceAllocationBounds: { x: 0, y: 0, width: 10, height: 10 },
      sourceVisualOverflowBounds: { x: -2, y: -2, width: 14, height: 14 },
      contentBox: { x: 100, y: 50, width: 0, height: 30 },
      horizontalAlign: 'center',
      verticalAlign: 'center',
      fit: 'none',
      overflow: 'clip',
    };

    const result = computeTableCellContentPlacement(input);

    expect(result.clipBounds).toBeUndefined();
    expect(result.replayContent).toBe(false);
    expect(result.visualOverflowBounds).toEqual({ x: 100, y: 50, width: 0, height: 30 });
    expect(input).toEqual({
      sourceAllocationBounds: { x: 0, y: 0, width: 10, height: 10 },
      sourceVisualOverflowBounds: { x: -2, y: -2, width: 14, height: 14 },
      contentBox: { x: 100, y: 50, width: 0, height: 30 },
      horizontalAlign: 'center',
      verticalAlign: 'center',
      fit: 'none',
      overflow: 'clip',
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.visualOverflowBounds)).toBe(true);
  });

  it.each([
    [{ x: 0, y: 0, width: -1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 }, 'contain'],
    [{ x: Number.NaN, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 1, height: 1 }, 'cover'],
    [{ x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: Infinity, height: 1 }, 'stretch'],
  ] as const)('拒绝 %# 的无效拟合边界', (source, target, fit) => {
    expect(() => computeTableCellFitScale(source, target, fit)).toThrow(/table: Cell/);
  });

  it('当有限拟合输入溢出比例或投影边界时失败', () => {
    expect(() =>
      computeTableCellFitScale(
        { x: 0, y: 0, width: Number.MIN_VALUE, height: 1 },
        { x: 0, y: 0, width: Number.MAX_VALUE, height: 1 },
        'stretch',
      ),
    ).toThrow(/finite/);

    expect(() =>
      computeTableCellContentPlacement({
        sourceAllocationBounds: { x: 0, y: 0, width: 1, height: 1 },
        sourceVisualOverflowBounds: { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 1 },
        contentBox: { x: 0, y: 0, width: 1, height: 1 },
        horizontalAlign: 'start',
        verticalAlign: 'start',
        fit: 'none',
        overflow: 'visible',
      }),
    ).toThrow(/finite/);
  });
});
