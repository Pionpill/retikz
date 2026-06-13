import { describe, expect, it } from 'vitest';
import {
  AbsoluteTargetSchema,
  BetweenPositionSchema,
  type IRAbsoluteTarget,
  type IRBetweenPosition,
} from '../../src/ir';

describe('两端点之间按比例取点的端点形态', () => {
  it('端点为笛卡尔坐标 [x, y] 接受', () => {
    const valid: IRBetweenPosition = { between: [[0, 0], [100, 0]], t: 0.5 };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('端点为极坐标对象接受', () => {
    const valid: IRBetweenPosition = {
      between: [
        { origin: 'A', angle: 0, radius: 30 },
        { origin: 'A', angle: 90, radius: 30 },
      ],
      t: 0.5,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('端点为节点引用 { id } 接受', () => {
    const valid: IRBetweenPosition = {
      between: [{ id: 'A' }, { id: 'B' }],
      t: 0.5,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('端点为带 anchor 的节点引用接受', () => {
    const valid: IRBetweenPosition = {
      between: [
        { id: 'A', anchor: 'north' },
        { id: 'B', anchor: 'south', offset: [5, 0] },
      ],
      t: 0.25,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('端点为 offset 定位对象 { of, offset } 接受', () => {
    const valid: IRBetweenPosition = {
      between: [
        { of: 'A', offset: [10, 0] },
        { of: [0, 0], offset: [0, 20] },
      ],
      t: 0.5,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('端点为嵌套 between 接受（between 套 between）', () => {
    const valid: IRBetweenPosition = {
      between: [
        { between: [{ id: 'A' }, { id: 'B' }], t: 0.5 },
        { id: 'C' },
      ],
      t: 0.5,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('两端点混合不同形态（笛卡尔 + 节点引用）接受', () => {
    const valid: IRBetweenPosition = {
      between: [[0, 0], { id: 'B' }],
      t: 0.5,
    };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });
});

describe('比例 t 的取值范围', () => {
  it('t=0 边界接受', () => {
    const valid: IRBetweenPosition = { between: [[0, 0], [100, 0]], t: 0 };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('t=1 边界接受', () => {
    const valid: IRBetweenPosition = { between: [[0, 0], [100, 0]], t: 1 };
    expect(() => BetweenPositionSchema.parse(valid)).not.toThrow();
  });

  it('t>1（1.5）拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({ between: [[0, 0], [100, 0]], t: 1.5 }),
    ).toThrow();
  });

  it('t<0（-0.1）拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({ between: [[0, 0], [100, 0]], t: -0.1 }),
    ).toThrow();
  });

  it('t 缺失拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({ between: [[0, 0], [100, 0]] }),
    ).toThrow();
  });
});

describe('端点排除 path-relative 形态', () => {
  it('端点为 { relative } 偏移拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({
        between: [{ relative: [1, 1] }, { id: 'B' }],
        t: 0.5,
      }),
    ).toThrow();
  });

  it('端点为 { relativeAccumulate } 偏移拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({
        between: [{ id: 'A' }, { relativeAccumulate: [1, 1] }],
        t: 0.5,
      }),
    ).toThrow();
  });

  it('AbsoluteTargetSchema 单独接受非 relative 端点形态', () => {
    const cartesian: IRAbsoluteTarget = [0, 0];
    const node: IRAbsoluteTarget = { id: 'A' };
    const nested: IRAbsoluteTarget = { between: [[0, 0], [10, 0]], t: 0.5 };
    expect(() => AbsoluteTargetSchema.parse(cartesian)).not.toThrow();
    expect(() => AbsoluteTargetSchema.parse(node)).not.toThrow();
    expect(() => AbsoluteTargetSchema.parse(nested)).not.toThrow();
  });

  it('AbsoluteTargetSchema 拒绝 relative 端点', () => {
    expect(() => AbsoluteTargetSchema.parse({ relative: [1, 1] })).toThrow();
  });
});

describe('between 结构完整性', () => {
  it('between 仅含 1 个端点拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({ between: [[0, 0]], t: 0.5 }),
    ).toThrow();
  });

  it('between 含 3 个端点拒绝', () => {
    expect(() =>
      BetweenPositionSchema.parse({
        between: [[0, 0], [50, 0], [100, 0]],
        t: 0.5,
      }),
    ).toThrow();
  });

  it('between 字段缺失拒绝', () => {
    expect(() => BetweenPositionSchema.parse({ t: 0.5 })).toThrow();
  });
});
