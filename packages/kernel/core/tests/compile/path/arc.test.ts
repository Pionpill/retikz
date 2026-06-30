import { describe, expect, it } from 'vitest';

import { arc, line, move } from '../../helpers/path-command-factory';
import { pathCommands } from './helpers';

describe("compile path: 'arc'", () => {
  it('arc 0°→90° 在 [0,0] 圆心 r=10 → M 10,0 A 10 10 0 0 1 0 10', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
      ]),
    ).toEqual([move([10, 0]), arc([0, 0], 10, 0, 90)]);
  });

  it('arc 0°→270°（large arc）→ largeArc flag = 1', () => {
    // 结构化期望：move 到 startPt (10,0)，再 arc 段角度跨 270° → adapter 自行计算 largeArc=1
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 270, radius: 10 },
      ]),
    ).toEqual([move([10, 0]), arc([0, 0], 10, 0, 270)]);
  });

  it('arc 之后接 line：line 起点是弧的终点（不是圆心）', () => {
    // 弧终点 = (0, 10)；line 从 (0, 10) → (50, 50)
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
        { type: 'step', kind: 'line', to: [50, 50] },
      ]),
    ).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      line([50, 50]),
    ]);
  });

  it('arc 圆心带偏移（move 到 [5,5]）', () => {
    // 起点 = (5+10, 5) = (15, 5)；圆心 = (5,5)，r=10
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [5, 5] },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
      ]),
    ).toEqual([move([15, 5]), arc([5, 5], 10, 0, 90)]);
  });
});
