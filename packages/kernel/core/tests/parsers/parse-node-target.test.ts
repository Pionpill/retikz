import { describe, expect, it } from 'vitest';

import { parseNodeTarget } from '../../src/parse/node-target';

describe('parseNodeTarget node 模式（无 .）', () => {
  it('简单 id → { id }', () => {
    expect(parseNodeTarget('A')).toEqual({ id: 'A' });
  });

  it('含连字符 / 下划线的 id', () => {
    expect(parseNodeTarget('my-node')).toEqual({ id: 'my-node' });
    expect(parseNodeTarget('node_123')).toEqual({ id: 'node_123' });
  });
});

describe('parseNodeTarget 命名 anchor 模式（id.<name>）', () => {
  it('9 个 canonical 方位 anchor 全识别 → { id, anchor }', () => {
    for (const name of [
      'center',
      'top',
      'right',
      'bottom',
      'left',
      'top-right',
      'top-left',
      'bottom-right',
      'bottom-left',
    ]) {
      expect(parseNodeTarget(`A.${name}`)).toEqual({ id: 'A', anchor: name });
    }
  });

  it('含连字符的 id 也行', () => {
    expect(parseNodeTarget('my-node.right')).toEqual({ id: 'my-node', anchor: 'right' });
  });

  it('compass / TikZ 风格 anchor alias 归一到 canonical anchor', () => {
    expect(parseNodeTarget('A.north')).toEqual({ id: 'A', anchor: 'top' });
    expect(parseNodeTarget('A.north-west')).toEqual({ id: 'A', anchor: 'top-left' });
    expect(parseNodeTarget('A.south-east')).toEqual({ id: 'A', anchor: 'bottom-right' });
    expect(parseNodeTarget('A.above')).toEqual({ id: 'A', anchor: 'top' });
    expect(parseNodeTarget('A.above-left')).toEqual({ id: 'A', anchor: 'top-left' });
    expect(parseNodeTarget('A.below-right')).toEqual({ id: 'A', anchor: 'bottom-right' });
  });

  it('未知 anchor 名抛错', () => {
    expect(() => parseNodeTarget('A.unknown')).toThrow(/unknown anchor 'unknown'/);
    expect(() => parseNodeTarget('A.text')).toThrow(/unknown anchor 'text'/);
  });
});

describe('parseNodeTarget 空 id 守卫（adversarial H1）', () => {
  it("空串 '' → 抛错（不产出非法 { id: '' }）", () => {
    expect(() => parseNodeTarget('')).toThrow(/empty node id/);
  });

  it("'.top'（空 id + anchor）→ 抛错", () => {
    expect(() => parseNodeTarget('.top')).toThrow(/empty node id/);
  });

  it("'.30'（空 id + 角度）→ 抛错", () => {
    expect(() => parseNodeTarget('.30')).toThrow(/empty node id/);
  });
});

describe('parseNodeTarget 角度 anchor 模式（id.<deg>）', () => {
  it('正整数 / 负 / 小数角度 → { id, anchor: number }', () => {
    expect(parseNodeTarget('A.30')).toEqual({ id: 'A', anchor: 30 });
    expect(parseNodeTarget('A.-45')).toEqual({ id: 'A', anchor: -45 });
    expect(parseNodeTarget('A.180.5')).toEqual({ id: 'A', anchor: 180.5 });
  });

  it('0 / 360 也是角度', () => {
    expect(parseNodeTarget('A.0')).toEqual({ id: 'A', anchor: 0 });
    expect(parseNodeTarget('A.360')).toEqual({ id: 'A', anchor: 360 });
  });

  it('纯数字小数字符串不按 id.angle 拆分', () => {
    expect(() => parseNodeTarget('12.5')).toThrow(/numeric coordinate/);
    expect(() => parseNodeTarget('.5')).toThrow(/empty node id/);
  });
});

describe('parseNodeTarget dotted-id 限制（按第一个点切分）', () => {
  it("'a.b.top' → id 'a' + tail 'b.top' 非命名 anchor → 抛错（含 . 的 id 须用对象）", () => {
    expect(() => parseNodeTarget('a.b.top')).toThrow(/unknown anchor/);
  });
});
