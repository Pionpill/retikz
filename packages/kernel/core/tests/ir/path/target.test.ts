import { describe, expect, it } from 'vitest';

import { AnchorRefSchema, NodeTargetSchema, TargetSchema } from '../../../src/schemas';

describe('AnchorRefSchema：命名 / 角度 / 边上比例点', () => {
  it('接受 9 个 Web canonical 命名 anchor', () => {
    for (const name of ['center', 'top', 'right', 'bottom', 'left', 'top-right', 'top-left', 'bottom-right', 'bottom-left']) {
      expect(() => AnchorRefSchema.parse(name)).not.toThrow();
    }
  });

  it('compass 命名 anchor 作为输入别名归一到 Web canonical', () => {
    expect(AnchorRefSchema.parse('north')).toBe('top');
    expect(AnchorRefSchema.parse('south-west')).toBe('bottom-left');
    expect(AnchorRefSchema.parse('above-left')).toBe('top-left');
    expect(AnchorRefSchema.parse('below-right')).toBe('bottom-right');
  });

  it('接受角度 anchor（含负 / 小数）', () => {
    expect(AnchorRefSchema.parse(30)).toBe(30);
    expect(AnchorRefSchema.parse(-45)).toBe(-45);
    expect(AnchorRefSchema.parse(180.5)).toBe(180.5);
  });

  it('接受 { side, fraction } 边上比例点并输出 Web canonical side', () => {
    expect(AnchorRefSchema.parse({ side: 'top', fraction: 0.25 })).toEqual({ side: 'top', fraction: 0.25 });
    expect(AnchorRefSchema.parse({ side: 'left', fraction: 0 })).toEqual({ side: 'left', fraction: 0 });
    expect(AnchorRefSchema.parse({ side: 'right', fraction: 1 })).toEqual({ side: 'right', fraction: 1 });
    expect(AnchorRefSchema.parse({ side: 'north', fraction: 0.25 })).toEqual({ side: 'top', fraction: 0.25 });
    expect(AnchorRefSchema.parse({ side: 'above', fraction: 0.25 })).toEqual({ side: 'top', fraction: 0.25 });
    expect(AnchorRefSchema.parse({ side: 'below', fraction: 0.25 })).toEqual({ side: 'bottom', fraction: 0.25 });
  });

  it('角度 NaN / Infinity 被拒（.finite）', () => {
    expect(() => AnchorRefSchema.parse(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => AnchorRefSchema.parse(Number.NaN)).toThrow();
  });

  it('{ side, fraction } 的 t 越界报错（< 0 / > 1）', () => {
    expect(() => AnchorRefSchema.parse({ side: 'top', fraction: 1.5 })).toThrow();
    expect(() => AnchorRefSchema.parse({ side: 'top', fraction: -0.1 })).toThrow();
  });

  it('未知 side 报错', () => {
    expect(() => AnchorRefSchema.parse({ side: 'up', fraction: 0.5 })).toThrow();
  });
});

describe('NodeTargetSchema：{ id, anchor?, offset? }', () => {
  it('仅 id', () => {
    expect(NodeTargetSchema.parse({ id: 'A' })).toEqual({ id: 'A' });
  });

  it('id + 命名 / 角度 / 边上比例点 anchor', () => {
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 'north' })).toEqual({ id: 'A', anchor: 'top' });
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 'below-right' })).toEqual({
      id: 'A',
      anchor: 'bottom-right',
    });
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 30 })).toEqual({ id: 'A', anchor: 30 });
    expect(NodeTargetSchema.parse({ id: 'A', anchor: { side: 'north', fraction: 0.25 } })).toEqual({
      id: 'A',
      anchor: { side: 'top', fraction: 0.25 },
    });
  });

  it('id + anchor + 世界系 offset', () => {
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 'west', offset: [-4, 0] })).toEqual({
      id: 'A',
      anchor: 'left',
      offset: [-4, 0],
    });
  });

  it('缺 id 报错', () => {
    expect(() => NodeTargetSchema.parse({ anchor: 'north' })).toThrow();
    expect(() => NodeTargetSchema.parse({ id: '' })).toThrow();
  });

  it('offset 非有限值被拒（.finite）', () => {
    expect(() => NodeTargetSchema.parse({ id: 'A', offset: [Number.POSITIVE_INFINITY, 0] })).toThrow();
  });
});

describe('TargetSchema 接受对象形态 + 既有形态', () => {
  it('接受 NodeTarget 对象', () => {
    expect(() => TargetSchema.parse({ id: 'A', anchor: { side: 'top', fraction: 0.5 } })).not.toThrow();
  });

  it('仍接受笛卡尔 / polar / relative / offset', () => {
    expect(() => TargetSchema.parse([1, 2])).not.toThrow();
    expect(() => TargetSchema.parse({ origin: 'A', angle: 0, radius: 30 })).not.toThrow();
    expect(() => TargetSchema.parse({ relative: [1, 0] })).not.toThrow();
    expect(() => TargetSchema.parse({ of: 'A', offset: [1, 0] })).not.toThrow();
  });
});

describe('JSON round-trip', () => {
  it('NodeTarget 对象经 JSON.stringify/parse 语义不变', () => {
    const target = { id: 'A', anchor: { side: 'left', fraction: 1 / 3 }, offset: [-4, 0] };
    const round = NodeTargetSchema.parse(JSON.parse(JSON.stringify(target)));
    expect(round).toEqual(target);
  });
});
