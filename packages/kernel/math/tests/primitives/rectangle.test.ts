import { describe, expect, it } from 'vitest';

import { rectOutline } from '../../src';

describe('中心矩形', () => {
  it('对角顺序不影响轮廓，圆角夹紧至最短半轴', () => {
    const commands = rectOutline([10, 6], [0, 0], 100);
    expect(commands).toEqual(rectOutline([0, 0], [10, 6], 100));
    expect(commands.filter(command => command.kind === 'arc').map(command => command.radius)).toEqual([3, 3, 3, 3]);
    expect(rectOutline([0, 0], [0, 0])).toHaveLength(5);
  });
});
