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

    it("DrawWay.Hv / DrawWay.Vh 与裸 '-|' / '|-' 算子等价", () => {
      expect(parseWay(['A', DrawWay.Hv, 'B', DrawWay.Vh, 'C'])).toEqual(
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
      expect(() => parseWay(['A', '-|', DrawWay.Cycle])).toThrow(
        /via operator '-\|' must be followed by a target/,
      );
    });
  });

  describe('闭合关键字 DrawWay.Cycle', () => {
    it('DrawWay.Cycle 解析为 cycle step（无 to）', () => {
      expect(parseWay(['A', 'B', DrawWay.Cycle])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: 'B' },
        { type: 'step', kind: 'cycle' },
      ]);
    });

    it('cycle 可与 fold 算子混用', () => {
      expect(parseWay(['A', '-|', 'B', 'C', DrawWay.Cycle])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: 'B' },
        { type: 'step', kind: 'line', to: 'C' },
        { type: 'step', kind: 'cycle' },
      ]);
    });

    it('首项是 DrawWay.Cycle 时降级为 move 到 [0, 0]（容错）', () => {
      const steps = parseWay([DrawWay.Cycle, 'B']);
      expect(steps[0]).toEqual({ type: 'step', kind: 'move', to: [0, 0] });
      expect(steps[1]).toEqual({ type: 'step', kind: 'line', to: 'B' });
    });

    it("裸字符串 'cycle' 不触发闭合——视作普通节点 id（与 DrawWay.Cycle 字面值刻意不同）", () => {
      const steps = parseWay(['A', 'cycle']);
      expect(steps[1]).toEqual({ type: 'step', kind: 'line', to: 'cycle' });
    });
  });

  describe('DrawWay 常量值锁定', () => {
    it('Cycle / Relative / Accumulate 取不与节点 id 撞车的字符串；折角直接用 TikZ 字面', () => {
      expect(DrawWay.Cycle).toBe('retikz-keyword_cycle');
      expect(DrawWay.Hv).toBe('-|');
      expect(DrawWay.Vh).toBe('|-');
      expect(DrawWay.Relative).toBe('retikz-keyword_relative');
      expect(DrawWay.Accumulate).toBe('retikz-keyword_accumulate');
    });
  });

  describe('曲线算子 (infix, ADR-0001 alpha.3)', () => {
    it("{ curve } 在两个 target 之间产出 curve step", () => {
      expect(parseWay(['A', { curve: [5, 8] }, 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'curve', to: 'B', control: [5, 8] },
      ]);
    });

    it("{ cubic } 在两个 target 之间产出 cubic step", () => {
      expect(
        parseWay([
          'A',
          { cubic: [[3, 5], [7, 5]] },
          'B',
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'cubic', to: 'B', control1: [3, 5], control2: [7, 5] },
      ]);
    });

    it("{ bend: 'left' } 默认角度（无 angle 字段，IR 也无 bendAngle）", () => {
      expect(parseWay(['A', { bend: 'left' }, 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'bend', to: 'B', bendDirection: 'left' },
      ]);
    });

    it("{ bend: 'right', angle: 60 } 透传 bendAngle", () => {
      expect(parseWay(['A', { bend: 'right', angle: 60 }, 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'bend',
          to: 'B',
          bendDirection: 'right',
          bendAngle: 60,
        },
      ]);
    });

    it("曲线算子可与 line / 折角 / cycle 混用", () => {
      expect(
        parseWay([
          'A',
          { curve: [50, -30] },
          'B',
          [10, 10],
          { bend: 'right' },
          'C',
          DrawWay.Cycle,
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'curve', to: 'B', control: [50, -30] },
        { type: 'step', kind: 'line', to: [10, 10] },
        { type: 'step', kind: 'bend', to: 'C', bendDirection: 'right' },
        { type: 'step', kind: 'cycle' },
      ]);
    });

    it("曲线算子在 way 末尾（无下一项）抛错", () => {
      expect(() => parseWay(['A', { curve: [1, 2] }])).toThrow(
        /curve operator at end/,
      );
      expect(() => parseWay(['A', { bend: 'left' }])).toThrow(
        /curve operator at end/,
      );
    });

    it("曲线算子后接另一个算子 / cycle 抛错", () => {
      expect(() =>
        parseWay(['A', { curve: [1, 2] }, '-|', 'B']),
      ).toThrow(/curve operator must be followed by a target/);
      expect(() =>
        parseWay(['A', { bend: 'left' }, DrawWay.Cycle]),
      ).toThrow(/curve operator must be followed by a target/);
      expect(() =>
        parseWay(['A', { curve: [1, 2] }, { bend: 'right' }, 'B']),
      ).toThrow(/curve operator must be followed by a target/);
    });

    it("折角算子后接曲线算子也抛错（互不允许相邻）", () => {
      expect(() => parseWay(['A', '-|', { curve: [1, 2] }, 'B'])).toThrow(
        /via operator '-\|' must be followed by a target/,
      );
    });
  });

  describe('形状算子 (infix, ADR-0002 alpha.3)', () => {
    it("{ arc: {...} } 产出 arc step（不消耗下一项）", () => {
      expect(
        parseWay([
          'A',
          { arc: { startAngle: 0, endAngle: 90, radius: 10 } },
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
      ]);
    });

    it("{ circle: { radius } } 产出 circlePath step", () => {
      expect(parseWay(['A', { circle: { radius: 5 } }])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'circlePath', radius: 5 },
      ]);
    });

    it("{ ellipse: { radiusX, radiusY } } 产出 ellipsePath step", () => {
      expect(
        parseWay(['A', { ellipse: { radiusX: 8, radiusY: 4 } }]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'ellipsePath', radiusX: 8, radiusY: 4 },
      ]);
    });

    it("形状算子不消耗下一项：后续 way item 正常解析", () => {
      expect(
        parseWay([
          'A',
          { arc: { startAngle: 0, endAngle: 90, radius: 5 } },
          'B',
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 5 },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });

    it("形状算子可与 line / 曲线 / 折角 / cycle 混用", () => {
      expect(
        parseWay([
          'A',
          { circle: { radius: 3 } },
          [10, 0],
          { bend: 'left' },
          'B',
          DrawWay.Cycle,
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'circlePath', radius: 3 },
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'bend', to: 'B', bendDirection: 'left' },
        { type: 'step', kind: 'cycle' },
      ]);
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

  describe('Sugar 相对坐标字符串 (ADR-0003 alpha.3)', () => {
    it("way 里 '+1,0' / '++1,0' 解析为 { rel } / { relAccumulate } step", () => {
      expect(parseWay(['A', '+1,0', '++2,3'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: { rel: [1, 0] } },
        { type: 'step', kind: 'line', to: { relAccumulate: [2, 3] } },
      ]);
    });

    it("首项是 '+1,0' 时 move 的 to 也走 sugar 解析", () => {
      expect(parseWay(['+5,0', 'B'])).toEqual([
        { type: 'step', kind: 'move', to: { rel: [5, 0] } },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });

    it("'+1,0' 与折角算子混用：折角算子的 next target 也走 sugar", () => {
      expect(parseWay(['A', '-|', '+5,3'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: { rel: [5, 3] } },
      ]);
    });

    it("曲线算子的 next 走 sugar：'+1,0' 当 curve 终点", () => {
      expect(parseWay(['A', { curve: [5, 8] }, '+10,0'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'curve',
          to: { rel: [10, 0] },
          control: [5, 8],
        },
      ]);
    });
  });

  describe('Sugar 相对坐标对象形态 WayRelItem (ADR-0003 alpha.3)', () => {
    it("{ position, type: DrawWay.Relative } / DrawWay.Accumulate 解析为 { rel } / { relAccumulate }", () => {
      expect(
        parseWay([
          'A',
          { position: [1, 0], type: DrawWay.Relative },
          { position: [2, 3], type: DrawWay.Accumulate },
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: { rel: [1, 0] } },
        { type: 'step', kind: 'line', to: { relAccumulate: [2, 3] } },
      ]);
    });

    it('首项是 WayRelItem 时 move 的 to 也走 desugar', () => {
      expect(
        parseWay([{ position: [5, 0], type: DrawWay.Relative }, 'B']),
      ).toEqual([
        { type: 'step', kind: 'move', to: { rel: [5, 0] } },
        { type: 'step', kind: 'line', to: 'B' },
      ]);
    });

    it('与折角算子混用：折角算子的 next 也支持 WayRelItem', () => {
      expect(
        parseWay(['A', '-|', { position: [5, 3], type: DrawWay.Accumulate }]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'step', via: '-|', to: { relAccumulate: [5, 3] } },
      ]);
    });

    it('曲线算子的 next 也支持 WayRelItem', () => {
      expect(
        parseWay([
          'A',
          { curve: [5, 8] },
          { position: [10, 0], type: DrawWay.Relative },
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'curve',
          to: { rel: [10, 0] },
          control: [5, 8],
        },
      ]);
    });

    it('对象形态与字符串形态结果完全一致', () => {
      expect(
        parseWay([
          'A',
          { position: [1, 0], type: DrawWay.Relative },
          { position: [2, 3], type: DrawWay.Accumulate },
        ]),
      ).toEqual(parseWay(['A', '+1,0', '++2,3']));
    });
  });

  describe('ADR-0004：边标注 prefix label 算子', () => {
    it('line 段：{ label } prefix 写到 step.label', () => {
      expect(parseWay(['A', { label: { text: 'accept' } }, 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: 'B', label: { text: 'accept' } },
      ]);
    });

    it('字符串简记 { label: "x" } 等价 { label: { text: "x" } }', () => {
      expect(parseWay(['A', { label: 'accept' }, 'B'])).toEqual(
        parseWay(['A', { label: { text: 'accept' } }, 'B']),
      );
    });

    it('label 完整字段透传：position + side', () => {
      expect(
        parseWay([
          'A',
          { label: { text: 'q', position: 'near-end', side: 'sloped' } },
          'B',
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'line',
          to: 'B',
          label: { text: 'q', position: 'near-end', side: 'sloped' },
        },
      ]);
    });

    it('折角段（-|）也接受前置 label', () => {
      expect(parseWay(['A', { label: 'f' }, '-|', 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'step',
          via: '-|',
          to: 'B',
          label: { text: 'f' },
        },
      ]);
    });

    it('curve / cubic / bend 都接受前置 label', () => {
      expect(parseWay(['A', { label: 'q' }, { curve: [5, 8] }, 'B'])).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'curve',
          to: 'B',
          control: [5, 8],
          label: { text: 'q' },
        },
      ]);
      expect(
        parseWay([
          'A',
          { label: 'c' },
          { cubic: [[3, 5], [7, 5]] },
          'B',
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'cubic',
          to: 'B',
          control1: [3, 5],
          control2: [7, 5],
          label: { text: 'c' },
        },
      ]);
      expect(
        parseWay(['A', { label: 'b' }, { bend: 'left', angle: 45 }, 'B']),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'bend',
          to: 'B',
          bendDirection: 'left',
          bendAngle: 45,
          label: { text: 'b' },
        },
      ]);
    });

    it('arc / circle / ellipse 形状算子（不消耗 next）也接受前置 label', () => {
      expect(
        parseWay([
          'A',
          { label: 'a' },
          { arc: { startAngle: 0, endAngle: 90, radius: 5 } },
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'arc',
          startAngle: 0,
          endAngle: 90,
          radius: 5,
          label: { text: 'a' },
        },
      ]);
      expect(
        parseWay(['A', { label: 'o' }, { circle: { radius: 5 } }]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'circlePath',
          radius: 5,
          label: { text: 'o' },
        },
      ]);
      expect(
        parseWay([
          'A',
          { label: 'e' },
          { ellipse: { radiusX: 6, radiusY: 3 } },
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        {
          type: 'step',
          kind: 'ellipsePath',
          radiusX: 6,
          radiusY: 3,
          label: { text: 'e' },
        },
      ]);
    });

    it('多段独立 label：每段一个 label，互不干扰', () => {
      expect(
        parseWay([
          'A',
          { label: 'one' },
          'B',
          { label: 'two' },
          'C',
        ]),
      ).toEqual([
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: 'B', label: { text: 'one' } },
        { type: 'step', kind: 'line', to: 'C', label: { text: 'two' } },
      ]);
    });

    it('未给 label 的段不写出 label 字段（IR 保持紧凑）', () => {
      const out = parseWay(['A', { label: 'x' }, 'B', 'C']);
      expect(out[1]).toEqual({
        type: 'step',
        kind: 'line',
        to: 'B',
        label: { text: 'x' },
      });
      expect(out[2]).toEqual({ type: 'step', kind: 'line', to: 'C' });
    });

    it('way[0] 是 label 算子时抛错（没有段可挂）', () => {
      expect(() => parseWay([{ label: 'x' }, 'A', 'B'])).toThrow(
        /way\[0\] must be a target/,
      );
    });

    it('连续两个 label 算子抛错', () => {
      expect(() =>
        parseWay(['A', { label: 'x' }, { label: 'y' }, 'B']),
      ).toThrow(/cannot directly follow another label operator/);
    });

    it('cycle 上的 label 抛错（IR 不允许）', () => {
      expect(() =>
        parseWay(['A', 'B', { label: 'x' }, DrawWay.Cycle]),
      ).toThrow(/cycle step cannot carry a label/);
    });

    it('way 末尾未消费的 label 算子抛错', () => {
      expect(() => parseWay(['A', 'B', { label: 'x' }])).toThrow(
        /label operator at end of way/,
      );
    });

    it('via / curve 算子之后直接接 label 算子抛错（label 必须在段定义算子之前）', () => {
      // '-|' 期待 next target，得到 label op 应被识别为 operator → 触发原"must be followed by a target"
      expect(() => parseWay(['A', '-|', { label: 'x' }, 'B'])).toThrow(
        /must be followed by a target/,
      );
      expect(() =>
        parseWay(['A', { curve: [5, 8] }, { label: 'x' }, 'B']),
      ).toThrow(/curve operator must be followed by a target/);
    });
  });
});
