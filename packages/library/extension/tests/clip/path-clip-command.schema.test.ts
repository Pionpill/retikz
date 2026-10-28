import { describe, expect, it } from 'vitest';

import { PathClipCommandSchema } from '../../src/clip';

describe('PathClipCommandSchema 严格的对象行为', () => {
  it('移动命令拒绝未知字段', () => {
    expect(PathClipCommandSchema.safeParse({ kind: 'move', to: [0, 0], typo: true }).success).toBe(false);
  });

  it('arc 命令拒绝未知字段', () => {
    expect(
      PathClipCommandSchema.safeParse({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
        sweep: 'clockwise',
      }).success,
    ).toBe(false);
  });

  it('关闭命令拒绝未知字段', () => {
    expect(PathClipCommandSchema.safeParse({ kind: 'close', reason: 'done' }).success).toBe(false);
  });
});
