import { describe, expect, it } from 'vitest';
import { DrawWay, parseWay } from '@retikz/core';
import { draw } from '../src/builder/draw';

describe('@retikz/vanilla draw()', () => {
  it('draw-way-reuses-core：draw(way) 的 steps 与 core parseWay 逐字一致', () => {
    const p = draw(['a', 'b'], { arrow: '->' });
    expect(p.type).toBe('path');
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.arrow).toBe('->');
    expect(p.children).toEqual(parseWay(['a', 'b']));
  });

  it('draw-coords：way 接坐标点', () => {
    const p = draw([[0, 0], [50, 50]], { dashPattern: [4, 2] });
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.children).toEqual(parseWay([[0, 0], [50, 50]]));
    expect(p.dashPattern).toEqual([4, 2]);
  });

  it('way-full-set：Cycle / 折角 / 相对 / 曲线算子全集与 core parseWay 一致', () => {
    const way = [
      [0, 0] as [number, number],
      DrawWay.Hv,
      [40, 0] as [number, number],
      { position: [10, 10] as [number, number], type: DrawWay.Relative },
      { curve: [20, 30] as [number, number] },
      [60, 60] as [number, number],
      DrawWay.Cycle,
    ];
    const p = draw(way);
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.children).toEqual(parseWay(way));
  });

  it('draw-no-config：draw(way) 无 config 也合法', () => {
    const p = draw(['a', 'b']);
    expect(p).toEqual({ type: 'path', children: parseWay(['a', 'b']) });
  });
});
