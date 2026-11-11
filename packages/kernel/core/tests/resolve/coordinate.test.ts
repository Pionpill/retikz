import { describe, expect, it } from 'vitest';

import { resolveCoordinate } from '../../src/resolve';
import type { IRCoordinate } from '../../src/schemas';

describe('坐标声明解析', () => {
  it('省略距离与显式上下文距离得到相同结果，输入保持稀疏', () => {
    const input: IRCoordinate = { type: 'coordinate', id: 'c', position: { direction: 'right', of: 'node' } };
    const before = structuredClone(input);
    expect(resolveCoordinate(input, { nodeDistance: 24 })).toEqual(
      resolveCoordinate(
        {
          ...input,
          position: { direction: 'right', of: 'node', distance: 24 },
        },
        { nodeDistance: 24 },
      ),
    );
    expect(input).toEqual(before);
    expect(resolveCoordinate(input, { nodeDistance: 30 }).position).toMatchObject({ distance: 30 });
  });

  it('递归补全极坐标原点，同时保留引用与插值意图', () => {
    const input: IRCoordinate = {
      type: 'coordinate',
      id: 'c',
      position: {
        between: [
          { of: { origin: { radius: 2, angle: 0 }, radius: 3, angle: 90 }, offset: [1, 2] },
          { id: 'node', anchor: 'right' },
        ],
        fraction: 0.5,
      },
    };
    expect(resolveCoordinate(input, { nodeDistance: 24 })).toEqual({
      id: 'c',
      position: {
        between: [
          { of: { origin: { origin: [0, 0], radius: 2, angle: 0 }, radius: 3, angle: 90 }, offset: [1, 2] },
          { id: 'node', anchor: 'right' },
        ],
        fraction: 0.5,
      },
    });
  });
});
