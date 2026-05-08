import { describe, expect, it } from 'vitest';
import type { IRStep, IRTarget } from '../../src/ir';
import type { WayDSL } from '../../src/parsers/parseWay';
import { DrawWay, parseWay } from '../../src/parsers/parseWay';

/** 测试 helper：cycle step 没 to，统一返回 undefined；其他 kind 返回 .to */
const toOf = (s: IRStep): IRTarget | undefined =>
  s.kind === 'cycle' ? undefined : s.to;

describe('parseWay', () => {
  describe('基本形态', () => {
    it('两个节点 id 产出 [move, line]', () => {
      expect(parseWay(['A', 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });

    it('多段 way 后续全部为 line', () => {
      expect(parseWay(['A', [10, 10], 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: [10, 10] },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });
  });

  describe('Way 元素形态覆盖', () => {
    it('全是节点 id（string）', () => {
      const steps = parseWay(['A', 'B', 'C']);
      expect(steps.map(toOf)).toEqual(['A', 'B', 'C']);
    });

    it('全是笛卡尔坐标 [x, y]', () => {
      const steps = parseWay([
        [0, 0],
        [10, 10],
        [20, 0],
      ]);
      expect(steps.map(toOf)).toEqual([
        [0, 0],
        [10, 10],
        [20, 0],
      ]);
    });

    it('全是极坐标 PolarPosition', () => {
      const a = { angle: 0, radius: 10 };
      const b = { angle: 90, radius: 10 };
      const c = { origin: 'A', angle: 45, radius: 5 };
      expect(parseWay([a, b, c])).toEqual([
        { type: 'step', kind: 'move', to: a },
        { type: 'step', kind: 'line', to: b },
        { type: 'step', kind: 'line', to: c },
      ]);
    });

    it('混合形态：string + [x, y] + PolarPosition', () => {
      const polar = { angle: 30, radius: 5 };
      const steps = parseWay(['A', [10, 0], polar, 'B']);
      expect(steps).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: polar },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });
  });

  describe('结构不变量', () => {
    it.each<[string, WayDSL]>([
      ['两段', ['A', 'B']],
      ['四段', ['A', [1, 1], 'B', [2, 2]]],
      ['六段', ['A', 'B', 'C', 'D', 'E', 'F']],
    ])('输出长度等于输入长度（%s）', (_label, way) => {
      expect(parseWay(way)).toHaveLength(way.length);
    });

    it('首段 kind 永远是 "move"', () => {
      expect(parseWay(['A', 'B'])[0].kind).toBe('move');
      expect(parseWay([[0, 0], [1, 1]])[0].kind).toBe('move');
      expect(parseWay([{ angle: 0, radius: 1 }, 'B'])[0].kind).toBe('move');
    });

    it('除首段外、非 fold 项的段 kind 是 "line"', () => {
      const steps = parseWay(['A', 'B', 'C', 'D']);
      expect(steps.slice(1).every(s => s.kind === 'line')).toBe(true);
    });

    it('to 字段按 way 顺序对应', () => {
      const way: WayDSL = ['A', [1, 2], 'B', [3, 4]];
      const steps = parseWay(way);
      for (let i = 0; i < way.length; i++) {
        expect(toOf(steps[i])).toBe(way[i]);
      }
    });
  });

  describe('纯函数性', () => {
    it('不修改输入数组', () => {
      const way: WayDSL = ['A', 'B', 'C'];
      const before = [...way];
      parseWay(way);
      expect(way).toEqual(before);
    });

    it('不与输入 way item 共享对象（PolarPosition 引用透传 OK）', () => {
      const polar = { angle: 0, radius: 1 };
      const steps = parseWay([polar, 'B']);
      // to 字段是同一引用，不深拷贝（对 IR 使用方足够：IR 序列化时再深拷贝）
      expect(toOf(steps[0])).toBe(polar);
    });

    it('两次相同输入产出结构相等的结果', () => {
      const way: WayDSL = ['A', [1, 2], 'B'];
      expect(parseWay(way)).toEqual(parseWay(way));
    });
  });

  describe('折角算子 (infix)', () => {
    it("'-|' 在两个 target 之间产出 step 折角", () => {
      expect(parseWay(['A', '-|', 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: 'B' },
      ]);
    });

    it("'|-' 同理，目标可以是任意 IRTarget 形态", () => {
      expect(parseWay(['A', '|-', [10, 5]])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '|-', to: [10, 5] },
      ]);
    });

    it('混合 line + 折角算子 + line：折角与邻居 line 互不干扰', () => {
      expect(parseWay(['A', '-|', 'B', [10, 0]])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: 'B' },
        { type: 'step', kind: 'line', to: [10, 0] },
      ]);
    });

    it("DrawWay.hv / DrawWay.vh 与裸 '-|' / '|-' 算子等价", () => {
      expect(parseWay(['A', DrawWay.hv, 'B', DrawWay.vh, 'C'])).toEqual(
        parseWay(['A', '-|', 'B', '|-', 'C']),
      );
    });

    it("折角算子在 way 末尾（无下一项）抛错", () => {
      expect(() => parseWay(['A', '-|'])).toThrow(/via operator '-\|' at end/);
    });

    it("折角算子后接另一个算子 / cycle 抛错", () => {
      expect(() => parseWay(['A', '-|', '|-', 'B'])).toThrow(
        /via operator '-\|' must be followed by a target/,
      );
      expect(() => parseWay(['A', '-|', DrawWay.cycle])).toThrow(
        /via operator '-\|' must be followed by a target/,
      );
    });
  });

  describe('闭合关键字 DrawWay.cycle', () => {
    it("DrawWay.cycle 解析为 cycle step（无 to）", () => {
      expect(parseWay(['A', 'B', DrawWay.cycle])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: 'B' },
        { type: 'step', kind: 'cycle' },
      ]);
    });

    it('cycle 可与 fold 算子混用', () => {
      expect(parseWay(['A', '-|', 'B', 'C', DrawWay.cycle])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: 'B' },
        { type: 'step', kind: 'line', to: 'C' },
        { type: 'step', kind: 'cycle' },
      ]);
    });

    it('首项是 DrawWay.cycle 时降级为 move 到 [0, 0]（容错）', () => {
      const steps = parseWay([DrawWay.cycle, 'B']);
      expect(steps[0]).toEqual({ type: 'step', kind: 'move', to: [0, 0] });
      expect(steps[1]).toEqual({ type: 'step', kind: 'line', to: 'B' });
    });

    it("裸字符串 'cycle' 不触发闭合——视作普通节点 id（与 DrawWay.cycle 字面值刻意不同）", () => {
      const steps = parseWay(['A', 'cycle']);
      expect(steps[1]).toEqual({ type: 'step', kind: 'line', to: 'cycle' });
    });
  });

  describe('DrawWay 常量值锁定', () => {
    it('cycle 取不与节点 id 撞车的字符串；折角直接用 TikZ 字面', () => {
      expect(DrawWay.cycle).toBe('retikz-keyword_cycle');
      expect(DrawWay.hv).toBe('-|');
      expect(DrawWay.vh).toBe('|-');
    });
  });

  describe('错误路径', () => {
    it('空数组抛错（错误信息含解析器名）', () => {
      expect(() => parseWay([])).toThrow(/parseWay: .* at least 2/);
    });

    it('单项数组抛错', () => {
      expect(() => parseWay(['A'])).toThrow(/at least 2/);
    });
  });
});
