import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import {
  type IR,
  type IROffsetPosition,
  OffsetPositionSchema,
} from '../../src/ir';
import type { EllipsePrim, RectPrim, ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

/** 取所有 RectPrim（默认 rectangle 节点；带文本节点包 group，flatten 穿透） */
const rects = (prims: Array<ScenePrimitive>): Array<RectPrim> =>
  flattenPrims(prims).filter((p): p is RectPrim => p.type === 'rect');

const ellipses = (prims: Array<ScenePrimitive>): Array<EllipsePrim> =>
  flattenPrims(prims).filter((p): p is EllipsePrim => p.type === 'ellipse');

/** rect 中心点 */
const rectCenter = (r: RectPrim): [number, number] => [
  r.x + r.width / 2,
  r.y + r.height / 2,
];

const ellipseCenter = (e: EllipsePrim): [number, number] => [e.cx, e.cy];

describe('OffsetPosition: schema 校验', () => {
  it('合法 of=string + offset 通过校验', () => {
    const valid: IROffsetPosition = { of: 'A', offset: [10, 20] };
    expect(() => OffsetPositionSchema.parse(valid)).not.toThrow();
  });

  it('合法 of=Position + offset 通过校验', () => {
    const valid: IROffsetPosition = { of: [50, 50], offset: [5, 0] };
    expect(() => OffsetPositionSchema.parse(valid)).not.toThrow();
  });

  it('合法 of=PolarPosition + offset 通过校验', () => {
    const valid: IROffsetPosition = {
      of: { origin: 'A', angle: 45, radius: 30 },
      offset: [0, 5],
    };
    expect(() => OffsetPositionSchema.parse(valid)).not.toThrow();
  });

  it('合法 of=嵌套 PolarPosition 通过校验', () => {
    const valid: IROffsetPosition = {
      of: {
        origin: { origin: 'A', angle: 0, radius: 30 },
        angle: 90,
        radius: 20,
      },
      offset: [1, -2],
    };
    expect(() => OffsetPositionSchema.parse(valid)).not.toThrow();
  });

  it('offset 缺失 → 抛错', () => {
    expect(() => OffsetPositionSchema.parse({ of: 'A' })).toThrow();
  });

  it('of 缺失 → 抛错', () => {
    expect(() => OffsetPositionSchema.parse({ offset: [10, 20] })).toThrow();
  });

  it('offset 非二元组（三元组）→ 抛错', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: 'A', offset: [1, 2, 3] }),
    ).toThrow();
  });

  it('offset 非二元组（字符串）→ 抛错', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: 'A', offset: 'invalid' }),
    ).toThrow();
  });

  it('of 类型不在三态 union 中（object 形状错乱）→ 抛错', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: { foo: 'bar' }, offset: [0, 0] }),
    ).toThrow();
  });

  it('of=空字符串 → 抛错（z.string().min(1)）', () => {
    expect(() =>
      OffsetPositionSchema.parse({ of: '', offset: [0, 0] }),
    ).toThrow();
  });
});

describe('OffsetPosition: compile resolve（Node.position）', () => {
  describe('Happy path', () => {
    it('offset_of_string_basic：of=节点 id → 世界坐标累加', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { of: 'A', offset: [30, 10] } },
        ],
      };
      const [, b] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(b[0]).toBeCloseTo(30);
      expect(b[1]).toBeCloseTo(10);
    });

    it('offset_of_cartesian_direct：of=笛卡尔字面值 → 无需任何节点定义', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', position: { of: [50, 50], offset: [10, 0] }, text: 'X' },
        ],
      };
      const [x] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(x[0]).toBeCloseTo(60);
      expect(x[1]).toBeCloseTo(50);
    });

    it('offset_of_polar_recursive：of=PolarPosition → 极坐标解析后加 offset', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: {
              of: { origin: 'A', angle: 0, radius: 50 },
              offset: [0, 20],
            },
          },
        ],
      };
      const [, b] = rects(compileToScene(ir).primitives).map(rectCenter);
      // polar(A=(0,0), angle=0, r=50) = (50, 0)，+offset(0, 20) = (50, 20)
      expect(b[0]).toBeCloseTo(50);
      expect(b[1]).toBeCloseTo(20);
    });

    it('offset_of_polar_nested_polar：of 内层再 PolarPosition → 递归解析', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'node',
            id: 'B',
            position: {
              of: {
                origin: { origin: 'A', angle: 0, radius: 30 },
                angle: 90,
                radius: 20,
              },
              offset: [5, 0],
            },
          },
        ],
      };
      const [, b] = rects(compileToScene(ir).primitives).map(rectCenter);
      // inner polar = (30, 0); outer polar from (30,0) angle=90 r=20 = (30, 20); + offset(5, 0) = (35, 20)
      expect(b[0]).toBeCloseTo(35);
      expect(b[1]).toBeCloseTo(20);
    });

    it('offset_negative_values：offset 含负数 → 反向偏移', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [50, 50], text: 'A' },
          { type: 'node', id: 'B', position: { of: 'A', offset: [-20, -10] } },
        ],
      };
      const [, b] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(b[0]).toBeCloseTo(30);
      expect(b[1]).toBeCloseTo(40);
    });

    it('offset_nested_id_chain：A→B→C 链式 offset（id 形式）', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { of: 'A', offset: [10, 0] } },
          { type: 'node', id: 'C', position: { of: 'B', offset: [5, 5] } },
        ],
      };
      const [, b, c] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(b[0]).toBeCloseTo(10);
      expect(b[1]).toBeCloseTo(0);
      expect(c[0]).toBeCloseTo(15);
      expect(c[1]).toBeCloseTo(5);
    });
  });

  describe('边界', () => {
    it('offset_zero_value：offset=[0, 0] → 与基准点重合', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [7, 11], text: 'A' },
          { type: 'node', id: 'B', position: { of: 'A', offset: [0, 0] } },
        ],
      };
      const [a, b] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(b[0]).toBeCloseTo(a[0]);
      expect(b[1]).toBeCloseTo(a[1]);
    });

    it('offset_of_cartesian_at_origin：of=[0,0] + offset=[10,0]', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', position: { of: [0, 0], offset: [10, 0] }, text: 'X' },
        ],
      };
      const [x] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(x[0]).toBeCloseTo(10);
      expect(x[1]).toBeCloseTo(0);
    });

    it('offset_referent_at_polar_node：referent 自身用 polar position', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          // B 自身用 polar：B = polar(A, 0, 30) = (30, 0)
          { type: 'node', id: 'B', position: { origin: 'A', angle: 0, radius: 30 }, text: 'B' },
          // C offset of B (id 形式) = (30, 0) + (5, 5) = (35, 5)
          { type: 'node', id: 'C', position: { of: 'B', offset: [5, 5] } },
        ],
      };
      const [, , c] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(c[0]).toBeCloseTo(35);
      expect(c[1]).toBeCloseTo(5);
    });

    it('offset_referent_at_at_position：referent 自身用 AtPosition', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          // B at right of A distance 10 → (10, 0)
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A', distance: 10 },
            text: 'B',
          },
          // C offset of B = (10, 0) + (2, -3) = (12, -3)
          { type: 'node', id: 'C', position: { of: 'B', offset: [2, -3] } },
        ],
      };
      const [, , c] = rects(compileToScene(ir).primitives).map(rectCenter);
      expect(c[0]).toBeCloseTo(12);
      expect(c[1]).toBeCloseTo(-3);
    });
  });

  describe('错误路径', () => {
    it('offset_of_string_forward_reference_rejected：被引节点后定义 → 抛错', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'B', position: { of: 'A', offset: [10, 0] } },
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        ],
      };
      expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
    });

    it('offset_of_nested_polar_string_forward_ref_rejected：嵌套 polar 内 origin 字符串后定义 → 抛错', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            id: 'B',
            position: {
              of: { origin: 'A', angle: 0, radius: 30 },
              offset: [5, 0],
            },
          },
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        ],
      };
      expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
    });

    it('offset_of_unknown_id_rejected：of 引用未定义 id → 抛错', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'B', position: { of: 'nonexistent', offset: [0, 0] } },
        ],
      };
      expect(() => compileToScene(ir)).toThrow(/Cannot resolve position/);
    });
  });

  describe('交互', () => {
    it('offset_node_then_path_string_reference：B 用 offset 相对 A，path 用 B 字符串引用', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: { of: 'A', offset: [40, 0] }, text: 'B' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'line', to: { id: 'B' } },
            ],
          },
        ],
      };
      const scene = compileToScene(ir);
      const pathPrim = scene.primitives.find(p => p.type === 'path');
      expect(pathPrim).toBeDefined();
      const [, b] = rects(scene.primitives).map(rectCenter);
      expect(b[0]).toBeCloseTo(40);
      expect(b[1]).toBeCloseTo(0);
    });

    it('offset_mixed_with_other_position_kinds：五种 position 形态并存全部 resolve', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          // 1) 笛卡尔
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          // 2) polar
          { type: 'node', id: 'B', position: { origin: 'A', angle: 0, radius: 40 }, text: 'B' },
          // 3) at
          {
            type: 'node',
            id: 'C',
            position: { direction: 'below', of: 'A', distance: 30 },
            text: 'C',
          },
          // 4) offset of id
          { type: 'node', id: 'D', position: { of: 'B', offset: [10, 0] }, text: 'D' },
          // 5) offset of Cartesian
          { type: 'node', id: 'E', position: { of: [100, 100], offset: [-5, 0] }, text: 'E' },
          // 6) offset of polar
          {
            type: 'node',
            id: 'F',
            position: {
              of: { origin: 'A', angle: 90, radius: 50 },
              offset: [0, 0],
            },
            text: 'F',
          },
        ],
      };
      const cs = rects(compileToScene(ir).primitives).map(rectCenter);
      const [a, b, c, d, e, f] = cs;
      expect(a[0]).toBeCloseTo(0);
      expect(a[1]).toBeCloseTo(0);
      expect(b[0]).toBeCloseTo(40);
      expect(b[1]).toBeCloseTo(0);
      expect(c[0]).toBeCloseTo(0);
      expect(c[1]).toBeCloseTo(30);
      expect(d[0]).toBeCloseTo(50);
      expect(d[1]).toBeCloseTo(0);
      expect(e[0]).toBeCloseTo(95);
      expect(e[1]).toBeCloseTo(100);
      // polar(A, 90, 50) = (0, 50)，+ [0, 0]
      expect(f[0]).toBeCloseTo(0);
      expect(f[1]).toBeCloseTo(50);
    });

    it('offset_of_polar_with_at_node_origin：polar.origin 链到 at-positioned 节点', () => {
      const ir: IR = {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          // B 自身 at right of A，distance 10 → (10, 0)
          {
            type: 'node',
            id: 'B',
            position: { direction: 'right', of: 'A', distance: 10 },
            text: 'B',
          },
          // C offset of polar(origin=B, angle=0, r=30) = polar((10,0), 0, 30) = (40, 0); + [0, 5] = (40, 5)
          {
            type: 'node',
            id: 'C',
            position: {
              of: { origin: 'B', angle: 0, radius: 30 },
              offset: [0, 5],
            },
            shape: 'circle',
          },
        ],
      };
      const [c] = ellipses(compileToScene(ir).primitives).map(ellipseCenter);
      expect(c[0]).toBeCloseTo(40);
      expect(c[1]).toBeCloseTo(5);
    });
  });
});

describe('OffsetPosition: Coordinate.position', () => {
  it('Coordinate 用 offset 作为 anchor → 后续 node 用 offset.of=coordinate.id 引用', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'coordinate', id: 'a', position: [0, 0] },
        // b coordinate = a + (50, 0) = (50, 0)
        { type: 'coordinate', id: 'b', position: { of: 'a', offset: [50, 0] } },
        // node placed at offset of b + (0, 30) = (50, 30)
        { type: 'node', id: 'N', position: { of: 'b', offset: [0, 30] }, text: 'N' },
      ],
    };
    const [n] = rects(compileToScene(ir).primitives).map(rectCenter);
    expect(n[0]).toBeCloseTo(50);
    expect(n[1]).toBeCloseTo(30);
  });
});
