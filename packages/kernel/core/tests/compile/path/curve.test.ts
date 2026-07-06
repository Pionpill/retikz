import { describe, expect, it } from 'vitest';

import { close, line, move, quad } from '../../helpers/path-command-factory';
import { pathCommands } from './helpers';

describe("compile path: 'curve'", () => {
  it('curve 直接坐标 → M ... Q cx,cy x,y', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'curve', to: [10, 0], control: [5, 8] },
      ]),
    ).toEqual([move([0, 0]), quad([5, 8], [10, 0])]);
  });

  it('curve 与 line 混用：line → curve → line 串联', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [5, 0] },
        { type: 'step', kind: 'curve', to: [10, 5], control: [10, 0] },
        { type: 'step', kind: 'line', to: [10, 10] },
      ]),
    ).toEqual([move([0, 0]), line([5, 0]), quad([10, 0], [10, 5]), line([10, 10])]);
  });

  it('curve 接 cycle：闭合段是直线', () => {
    expect(
      pathCommands([
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'curve', to: [10, 0], control: [5, 8] },
        { type: 'step', kind: 'cycle' },
      ]),
    ).toEqual([move([0, 0]), quad([5, 8], [10, 0]), close()]);
  });
});
