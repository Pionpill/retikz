import { describe, expect, it } from 'vitest';

import type { ContourSegment } from '../../src';
import { buildContourCommands, intersectContourRay, solveContourFillets } from '../../src';

const square: Array<ContourSegment> = [
  { kind: 'line', from: [-10, -10], to: [10, -10] },
  { kind: 'line', from: [10, -10], to: [10, 10] },
  { kind: 'line', from: [10, 10], to: [-10, 10] },
  { kind: 'line', from: [-10, 10], to: [-10, -10] },
];

describe('中立轮廓几何', () => {
  it('四角相切且过大半径夹紧至半边长', () => {
    const fillets = solveContourFillets(square, 20)!;
    expect(fillets).toHaveLength(4);
    for (const fillet of fillets) {
      expect(fillet.radius).toBeCloseTo(10, 4);
      expect(
        Math.hypot(fillet.tangentInPoint[0] - fillet.center[0], fillet.tangentInPoint[1] - fillet.center[1]),
      ).toBeCloseTo(fillet.radius);
    }
    expect(intersectContourRay(square, [0, 0], [20, 20], fillets)).toEqual([
      expect.closeTo(Math.SQRT1_2 * 10, 4),
      expect.closeTo(Math.SQRT1_2 * 10, 4),
    ]);
  });

  it('开放轮廓保留首尾，不产生闭合圆角', () => {
    const segments = square.slice(0, 2);
    const fillets = solveContourFillets(segments, 2, false)!;
    expect(fillets.at(-1)?.clampedToZero).toBe(true);
    const commands = buildContourCommands(segments, fillets, false);
    expect(commands[0]).toEqual({ kind: 'move', to: [-10, -10] });
    expect(commands.at(-1)).toEqual({ kind: 'line', to: [10, 10] });
    expect(commands.some(command => command.kind === 'close')).toBe(false);
  });

  it('空轮廓、零方向和未命中返回中立空结果', () => {
    expect(solveContourFillets([], 2)).toEqual([]);
    expect(buildContourCommands([])).toEqual([]);
    expect(intersectContourRay(square, [0, 0], [0, 0])).toBeUndefined();
    expect(intersectContourRay(square, [20, 0], [30, 0])).toBeUndefined();
  });

  it('弧弧倒角返回无解，零半径仍可构造原始轮廓', () => {
    const arcs: Array<ContourSegment> = [
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 180 },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 180, endAngle: 360 },
    ];
    expect(solveContourFillets(arcs, 2)).toBeUndefined();
    expect(solveContourFillets(arcs, 0)).toEqual([]);
    expect(buildContourCommands(arcs)).toHaveLength(4);
    expect(intersectContourRay(arcs, [0, 0], [10, 0])).toEqual([10, 0]);
  });
});
