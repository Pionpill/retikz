/**
 * parseNodeTarget 单元测试（ADR-01）
 * @description 字符串 shorthand → NodeTarget 对象（单一真源，React DSL 层用）：
 *   node（无 .）/ 命名 anchor / 角度 anchor；未知 anchor 抛错；含 . 的 id 走对象（dotted-id 限制）
 */
import { describe, expect, it } from 'vitest';
import { parseNodeTarget } from '../../src/parsers/parseNodeTarget';

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
  it('9 个 RECT_ANCHORS 全识别 → { id, anchor }', () => {
    for (const name of [
      'center',
      'north',
      'south',
      'east',
      'west',
      'north-east',
      'north-west',
      'south-east',
      'south-west',
    ]) {
      expect(parseNodeTarget(`A.${name}`)).toEqual({ id: 'A', anchor: name });
    }
  });

  it('含连字符的 id 也行', () => {
    expect(parseNodeTarget('my-node.east')).toEqual({ id: 'my-node', anchor: 'east' });
  });

  it('未知 anchor 名抛错', () => {
    expect(() => parseNodeTarget('A.unknown')).toThrow(/unknown anchor 'unknown'/);
    expect(() => parseNodeTarget('A.text')).toThrow(/unknown anchor 'text'/);
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
});

describe('parseNodeTarget dotted-id 限制（按第一个点切分）', () => {
  it("'a.b.north' → id 'a' + tail 'b.north' 非命名 anchor → 抛错（含 . 的 id 须用对象）", () => {
    expect(() => parseNodeTarget('a.b.north')).toThrow(/unknown anchor/);
  });
});
