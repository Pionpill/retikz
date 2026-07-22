import { describe, expect, it } from 'vitest';

import type { IRAnchorPosition } from '../../src/schemas';

import { AnchorPositionSchema, CoordinateSchema, NodeSchema } from '../../src/schemas';

describe('Node anchor-to-anchor position schema', () => {
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

  it('接受 target anchor、offset、boundary 与 selfAnchor', () => {
    const value: IRAnchorPosition = {
      kind: 'anchor',
      target: {
        id: 'target',
        anchor: 'bottom-left',
        offset: [8, -3],
        boundary: 'shape',
      },
      selfAnchor: 'top-left',
    };

    expect(AnchorPositionSchema.parse(value)).toEqual(value);
  });

  it('保持闭合对象并拒绝未知字段', () => {
    expect(() =>
      AnchorPositionSchema.parse({
        kind: 'anchor',
        target: { id: 'target' },
        unexpected: true,
      }),
    ).toThrow();
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

  it('不把 anchor position 加入 Coordinate.position', () => {
    expect(() =>
      CoordinateSchema.parse({
        type: 'coordinate',
        id: 'coordinate',
        position: {
          kind: 'anchor',
          target: { id: 'target' },
        },
      }),
    ).toThrow();
  });
});
