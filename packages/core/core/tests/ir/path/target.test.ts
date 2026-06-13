/**
 * 结构化 Target / Anchor schema 单元测试（ADR-01）
 * @description AnchorRefSchema（命名 / 角度 / { side, t }）+ NodeTargetSchema（{ id, anchor?, offset? }）；
 *   TargetSchema 接受对象形态；finite / t 范围 / 缺 id 错误路径；JSON round-trip
 */
import { describe, expect, it } from 'vitest';
import { AnchorRefSchema, NodeTargetSchema, TargetSchema } from '../../../src/ir';

describe('AnchorRefSchema：命名 / 角度 / 边上比例点', () => {
  it('接受 9 个命名 anchor', () => {
    for (const name of ['center', 'north', 'south', 'east', 'west', 'north-east', 'north-west', 'south-east', 'south-west']) {
      expect(() => AnchorRefSchema.parse(name)).not.toThrow();
    }
  });

  it('接受角度 anchor（含负 / 小数）', () => {
    expect(AnchorRefSchema.parse(30)).toBe(30);
    expect(AnchorRefSchema.parse(-45)).toBe(-45);
    expect(AnchorRefSchema.parse(180.5)).toBe(180.5);
  });

  it('接受 { side, t } 边上比例点', () => {
    expect(AnchorRefSchema.parse({ side: 'north', t: 0.25 })).toEqual({ side: 'north', t: 0.25 });
    expect(AnchorRefSchema.parse({ side: 'west', t: 0 })).toEqual({ side: 'west', t: 0 });
    expect(AnchorRefSchema.parse({ side: 'east', t: 1 })).toEqual({ side: 'east', t: 1 });
  });

  it('角度 NaN / Infinity 被拒（.finite）', () => {
    expect(() => AnchorRefSchema.parse(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => AnchorRefSchema.parse(Number.NaN)).toThrow();
  });

  it('{ side, t } 的 t 越界报错（< 0 / > 1）', () => {
    expect(() => AnchorRefSchema.parse({ side: 'north', t: 1.5 })).toThrow();
    expect(() => AnchorRefSchema.parse({ side: 'north', t: -0.1 })).toThrow();
  });

  it('未知 side 报错', () => {
    expect(() => AnchorRefSchema.parse({ side: 'up', t: 0.5 })).toThrow();
  });
});

describe('NodeTargetSchema：{ id, anchor?, offset? }', () => {
  it('仅 id', () => {
    expect(NodeTargetSchema.parse({ id: 'A' })).toEqual({ id: 'A' });
  });

  it('id + 命名 / 角度 / 边上比例点 anchor', () => {
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 'north' })).toEqual({ id: 'A', anchor: 'north' });
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 30 })).toEqual({ id: 'A', anchor: 30 });
    expect(NodeTargetSchema.parse({ id: 'A', anchor: { side: 'north', t: 0.25 } })).toEqual({
      id: 'A',
      anchor: { side: 'north', t: 0.25 },
    });
  });

  it('id + anchor + 世界系 offset', () => {
    expect(NodeTargetSchema.parse({ id: 'A', anchor: 'west', offset: [-4, 0] })).toEqual({
      id: 'A',
      anchor: 'west',
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
    expect(() => TargetSchema.parse({ id: 'A', anchor: { side: 'north', t: 0.5 } })).not.toThrow();
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
    const target = { id: 'A', anchor: { side: 'west', t: 1 / 3 }, offset: [-4, 0] };
    const round = NodeTargetSchema.parse(JSON.parse(JSON.stringify(target)));
    expect(round).toEqual(target);
  });
});
