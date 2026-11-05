import { describe, expect, it } from 'vitest';

import type { IRAnchorPosition } from '../../src/schemas';
import { AnchorPositionSchema, NodeSchema } from '../../src/schemas';

describe('Node 锚点到锚点位置方案', () => {
  it('接受仅含 target.id 的最小形式', () => {
    const value: IRAnchorPosition = {
      kind: 'anchor',
      target: { id: 'target' },
    };

    expect(AnchorPositionSchema.parse(value)).toEqual(value);
    expect(
      NodeSchema.parse({
        type: 'node',
        position: value,
      }).position,
    ).toEqual(value);
  });

  it('kind 存在时只按 anchor 分支解析，不静默改写为其它 position', () => {
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: {
          kind: 'anchor',
          target: { id: 'target' },
          between: [
            [0, 0],
            [10, 10],
          ],
          fraction: 0.5,
        },
      }).success,
    ).toBe(false);
  });
});
