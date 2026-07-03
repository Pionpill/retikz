import type { IRPathRibbonOptions } from '@retikz/core';

import { DrawWay, parseWay } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { draw } from '../src/builder/draw';

describe('@retikz/vanilla draw()', () => {
  it('draw-way-reuses-core：draw(way) 的 steps 与 core parseWay 逐字一致', () => {
    const marks = [{ pos: 1, mark: { kind: 'arrow' as const } }];
    const p = draw(['a', 'b'], { marks });
    expect(p.type).toBe('path');
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.marks).toBe(marks);
    expect(p.children).toEqual(parseWay(['a', 'b']));
  });

  it('draw-coords：way 接坐标点', () => {
    const p = draw(
      [
        [0, 0],
        [50, 50],
      ],
      { dashPattern: [4, 2] },
    );
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.children).toEqual(
      parseWay([
        [0, 0],
        [50, 50],
      ]),
    );
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
    const p = draw(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      { roundedCorners: 8 },
    );
    if (p.type !== 'path') throw new Error('unreachable');
    expect(p.roundedCorners).toBe(8);
  });

  it('draw-no-config：draw(way) 无 config 也合法', () => {
    const p = draw(['a', 'b']);
    expect(p).toEqual({ type: 'path', children: parseWay(['a', 'b']) });
  });
});

describe('@retikz/vanilla draw(kind=ribbon)', () => {
  it('ribbon-way-reuses-core：draw(way, kind=ribbon) 的 steps 与 core parseWay 逐字一致', () => {
    const r = draw(['a', 'b'], {
      kind: 'ribbon',
      fill: 'steelblue',
      ribbon: {
        start: { width: 8, direction: 0 },
        end: { width: 2, direction: [1, 0] },
        samples: true,
      },
    });
    expect(r.type).toBe('path');
    if (r.type !== 'path') throw new Error('unreachable');
    expect(r.kind).toBe('ribbon');
    const options = r.ribbon as IRPathRibbonOptions;
    expect(options.start).toEqual({ width: 8, direction: 0 });
    expect(options.end).toEqual({ width: 2, direction: [1, 0] });
    expect(r.fill).toBe('steelblue');
    expect(options.samples).toBe(true);
    expect(r.children).toEqual(parseWay(['a', 'b']));
  });

  it('ribbon-label-forwards：draw(kind=ribbon, { label }) 透传 path-like geometry label', () => {
    const r = draw(['a', 'b'], {
      kind: 'ribbon',
      ribbon: { width: 8 },
      label: {
        text: '128',
        position: 'midway',
        sloped: true,
      },
    });

    expect(r.type).toBe('path');
    if (r.type !== 'path') throw new Error('unreachable');
    expect(r.kind).toBe('ribbon');
    expect(r.label).toEqual({
      text: '128',
      position: 'midway',
      sloped: true,
    });
  });
});
