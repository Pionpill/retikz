import { describe, expect, it } from 'vitest';
import { parseNodeRef } from '../../src/compile/parseTarget';

describe('parseNodeRef', () => {
  describe('node 模式（无 .）', () => {
    it("简单 id → kind='node'", () => {
      expect(parseNodeRef('A')).toEqual({ kind: 'node', id: 'A' });
    });

    it("含连字符 / 下划线的 id", () => {
      expect(parseNodeRef('my-node')).toEqual({ kind: 'node', id: 'my-node' });
      expect(parseNodeRef('node_123')).toEqual({ kind: 'node', id: 'node_123' });
    });
  });

  describe('anchor 模式（id.<name>）', () => {
    it("9 个 RECT_ANCHORS 全识别", () => {
      for (const name of ['center', 'north', 'south', 'east', 'west',
                           'north-east', 'north-west', 'south-east', 'south-west']) {
        expect(parseNodeRef(`A.${name}`)).toEqual({
          kind: 'anchor',
          id: 'A',
          anchor: name,
        });
      }
    });

    it("含连字符的 id 也行", () => {
      expect(parseNodeRef('my-node.east')).toEqual({
        kind: 'anchor',
        id: 'my-node',
        anchor: 'east',
      });
    });

    it("未知 anchor 名抛错", () => {
      expect(() => parseNodeRef('A.unknown')).toThrow(/unknown anchor 'unknown'/);
      expect(() => parseNodeRef('A.text')).toThrow(/unknown anchor 'text'/); // 保留给 alpha.2
    });
  });

  describe('angle 模式（id.<deg>）', () => {
    it("正整数角度", () => {
      expect(parseNodeRef('A.30')).toEqual({ kind: 'angle', id: 'A', angle: 30 });
    });

    it("负角度", () => {
      expect(parseNodeRef('A.-45')).toEqual({ kind: 'angle', id: 'A', angle: -45 });
    });

    it("小数角度", () => {
      expect(parseNodeRef('A.180.5')).toEqual({ kind: 'angle', id: 'A', angle: 180.5 });
    });

    it("0 / 180 / 360 也合法", () => {
      expect(parseNodeRef('A.0').kind).toBe('angle');
      expect(parseNodeRef('A.360').kind).toBe('angle');
    });
  });
});
