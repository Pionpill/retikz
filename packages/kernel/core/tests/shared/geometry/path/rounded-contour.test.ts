import type { ContourSegment } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../src';
import { boundaryFromContour, contourCommands, filletContour } from '../../../../src/shared/geometry/path';

const square: Array<ContourSegment> = [
  { kind: 'line', from: [-10, -10], to: [10, -10] },
  { kind: 'line', from: [10, -10], to: [10, 10] },
  { kind: 'line', from: [10, 10], to: [-10, 10] },
  { kind: 'line', from: [-10, 10], to: [-10, -10] },
];

describe('Core 轮廓接入', () => {
  it('复用显式圆角生成命令并定位圆角边界', () => {
    const fillets = filletContour(square, 4);
    const explicit = contourCommands(square, 4, fillets);
    expect(explicit).toEqual(contourCommands(square, 4));
    expect(explicit.filter(command => command.kind === 'arc')).toHaveLength(4);
    expect(boundaryFromContour(square, 4, [0, 0], [20, 20], fillets)).toEqual([
      expect.closeTo(6 + 4 * Math.SQRT1_2, 6),
      expect.closeTo(6 + 4 * Math.SQRT1_2, 6),
    ]);
  });

  it('显式空圆角保留尖角路径和交点', () => {
    const commands = contourCommands(square, 4, []);
    expect(commands.map(command => command.kind)).toEqual(['move', 'line', 'line', 'line', 'line', 'close']);
    expect(boundaryFromContour(square, 4, [0, 0], [20, 20], [])).toEqual([10, 10]);
  });

  it('把不支持的弧弧圆角转换为 Core geometry 错误', () => {
    const arcs: Array<ContourSegment> = [
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 90, endAngle: 0, counterClockwise: true },
    ];
    for (const operation of [
      () => filletContour(arcs, 3),
      () => contourCommands(arcs, 3),
      () => boundaryFromContour(arcs, 3, [0, 0], [20, 0]),
    ]) {
      expect(operation).toThrow(RetikzCoreError);
      expect(operation).toThrow(expect.objectContaining({ code: RetikzCoreErrorCode.Geometry }));
    }
  });
});
