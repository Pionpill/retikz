import { describe, expect, it } from 'vitest';
import { DrawWay, parseWay } from '@retikz/core';
import { draw } from '../src/builder/draw';
import { ribbon } from '../src/builder/ribbon';

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

  it('draw-rounded-corners：roundedCorners 透传进 path IR', () => {
    const p = draw([[0, 0], [10, 0], [10, 10]], { roundedCorners: 8 });
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.roundedCorners).toBe(8);
  });

  it('draw-no-config：draw(way) 无 config 也合法', () => {
    const p = draw(['a', 'b']);
    expect(p).toEqual({ type: 'path', children: parseWay(['a', 'b']) });
  });
});

describe('@retikz/vanilla ribbon()', () => {
  it('ribbon-way-reuses-core：ribbon(way) 的 steps 与 core parseWay 逐字一致', () => {
    const r = ribbon(['a', 'b'], { width: { start: 8, end: 2 }, startDirection: 0, endDirection: [1, 0], fill: 'steelblue' });
    expect(r.type).toBe('ribbon');
    if (r.type !== 'ribbon') throw new Error('unreachable');
    expect(r.width).toEqual({ start: 8, end: 2 });
    expect(r.startDirection).toBe(0);
    expect(r.endDirection).toEqual([1, 0]);
    expect(r.fill).toBe('steelblue');
    expect(r.children).toEqual(parseWay(['a', 'b']));
  });

  it('ribbon-boundary-reuses-core：boundary upper/lower 复用 core parseWay', () => {
    const r = ribbon({
      kind: 'boundary',
      upper: [
        [0, 0],
        [10, 0],
      ],
      lower: [
        [0, 4],
        [10, 4],
      ],
      fill: '#bfdbfe',
    });
    expect(r.type).toBe('ribbon');
    if (r.type !== 'ribbon') throw new Error('unreachable');
    expect(r.kind).toBe('boundary');
    expect(r.fill).toBe('#bfdbfe');
    expect(r.upper).toEqual(
      parseWay([
        [0, 0],
        [10, 0],
      ]),
    );
    expect(r.lower).toEqual(
      parseWay([
        [0, 4],
        [10, 4],
      ]),
    );
  });
});
