/**
 * bend out/in/looseness + path rotate/scale/marks schema 单元测试
 * @description 覆盖 BendStepSchema 三新字段（outAngle / inAngle / looseness）、PathSchema 三新字段
 *   （rotate / scale / marks）、ArrowMarkSchema（kind:'arrow' + 视觉子集）的合法 / 越界拒 / round-trip。
 *   编译行为（out/in→cubic、self-loop、path transform 包 GroupPrim、marks→marker）由 compile 测试覆盖。
 */
import { describe, expect, it } from 'vitest';
import {
  ArrowMarkSchema,
  BendStepSchema,
  PathScaleSchema,
  PathSchema,
} from '../../../src/ir';

/** 构造一条最小合法 path（两 step），便于叠加被测字段 */
const basePath = (extra: Record<string, unknown>) => ({
  type: 'path' as const,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
  ...extra,
});

describe('BendStepSchema：out/in/looseness 合法', () => {
  it('接受 outAngle / inAngle / looseness', () => {
    const ok = BendStepSchema.safeParse({
      type: 'step',
      kind: 'bend',
      to: { id: 'B' },
      bendDirection: 'left',
      outAngle: 30,
      inAngle: 150,
      looseness: 1.2,
    });
    expect(ok.success).toBe(true);
  });

  it('out/in 与 bendDirection / bendAngle 共存（schema 不互斥，优先级在编译层）', () => {
    const ok = BendStepSchema.safeParse({
      type: 'step',
      kind: 'bend',
      to: { id: 'B' },
      bendDirection: 'left',
      bendAngle: 40,
      outAngle: 30,
      inAngle: 150,
    });
    expect(ok.success).toBe(true);
  });

  it('零破坏：仅 bendDirection 的旧形态仍合法', () => {
    const ok = BendStepSchema.safeParse({
      type: 'step',
      kind: 'bend',
      to: { id: 'B' },
      bendDirection: 'right',
    });
    expect(ok.success).toBe(true);
  });

  it('负 outAngle / inAngle 合法（角度可负）', () => {
    const ok = BendStepSchema.safeParse({
      type: 'step',
      kind: 'bend',
      to: { id: 'B' },
      bendDirection: 'left',
      outAngle: -60,
      inAngle: -120,
    });
    expect(ok.success).toBe(true);
  });
});

describe('BendStepSchema：错误路径', () => {
  it('outAngle 为 NaN 拒（finite）', () => {
    expect(
      BendStepSchema.safeParse({
        type: 'step',
        kind: 'bend',
        to: { id: 'B' },
        bendDirection: 'left',
        outAngle: Number.NaN,
      }).success,
    ).toBe(false);
  });

  it('inAngle 为 Infinity 拒（finite）', () => {
    expect(
      BendStepSchema.safeParse({
        type: 'step',
        kind: 'bend',
        to: { id: 'B' },
        bendDirection: 'left',
        inAngle: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
  });

  it('looseness 为 0 拒（positive）', () => {
    expect(
      BendStepSchema.safeParse({
        type: 'step',
        kind: 'bend',
        to: { id: 'B' },
        bendDirection: 'left',
        looseness: 0,
      }).success,
    ).toBe(false);
  });

  it('looseness 为负拒（positive）', () => {
    expect(
      BendStepSchema.safeParse({
        type: 'step',
        kind: 'bend',
        to: { id: 'B' },
        bendDirection: 'left',
        looseness: -1,
      }).success,
    ).toBe(false);
  });
});

describe('PathScaleSchema：等比 number / 非等比 {x,y}', () => {
  it('接受等比 number', () => {
    expect(PathScaleSchema.safeParse(2).success).toBe(true);
  });

  it('接受非等比 {x,y}', () => {
    expect(PathScaleSchema.safeParse({ x: 2, y: 0.5 }).success).toBe(true);
  });

  it('number 为 0 拒（positive）', () => {
    expect(PathScaleSchema.safeParse(0).success).toBe(false);
  });

  it('number 为负拒', () => {
    expect(PathScaleSchema.safeParse(-1).success).toBe(false);
  });

  it('{x,y} 任一为 0 拒', () => {
    expect(PathScaleSchema.safeParse({ x: 0, y: 1 }).success).toBe(false);
    expect(PathScaleSchema.safeParse({ x: 1, y: 0 }).success).toBe(false);
  });

  it('{x} 缺 y 拒（两轴都必填）', () => {
    expect(PathScaleSchema.safeParse({ x: 2 }).success).toBe(false);
  });
});

describe('ArrowMarkSchema：kind:arrow + 视觉子集', () => {
  it('最小合法（仅 kind）', () => {
    expect(ArrowMarkSchema.safeParse({ kind: 'arrow' }).success).toBe(true);
  });

  it('kind + shape + 全视觉字段合法', () => {
    const ok = ArrowMarkSchema.safeParse({
      kind: 'arrow',
      shape: 'stealth',
      scale: 1.5,
      length: 10,
      width: 8,
      color: 'red',
      fill: 'blue',
      opacity: 0.5,
      lineWidth: 2,
    });
    expect(ok.success).toBe(true);
  });

  it('shape 任意非空名 schema 接受（注册名校验在编译层）', () => {
    expect(ArrowMarkSchema.safeParse({ kind: 'arrow', shape: 'myArrow' }).success).toBe(true);
  });

  it('kind 非 arrow 拒（首批仅 arrow）', () => {
    expect(ArrowMarkSchema.safeParse({ kind: 'dot' }).success).toBe(false);
    expect(ArrowMarkSchema.safeParse({ kind: 'text', shape: 'stealth' }).success).toBe(false);
  });

  it('缺 kind 拒', () => {
    expect(ArrowMarkSchema.safeParse({ shape: 'stealth' }).success).toBe(false);
  });

  it('shape:"->" 是合法非空名但语义上是箭头名（不是方向记号）', () => {
    // schema 只校验非空字符串；'->' 当作（不存在的）箭头名，编译期会因未注册而 throw
    expect(ArrowMarkSchema.safeParse({ kind: 'arrow', shape: '->' }).success).toBe(true);
  });

  it('scale 为 0 拒（positive，继承视觉子集约束）', () => {
    expect(ArrowMarkSchema.safeParse({ kind: 'arrow', scale: 0 }).success).toBe(false);
  });
});

describe('PathSchema：rotate / scale 合法', () => {
  it('接受 rotate（度）', () => {
    expect(PathSchema.safeParse(basePath({ rotate: 30 })).success).toBe(true);
  });

  it('接受负 rotate', () => {
    expect(PathSchema.safeParse(basePath({ rotate: -45 })).success).toBe(true);
  });

  it('接受等比 scale', () => {
    expect(PathSchema.safeParse(basePath({ scale: 2 })).success).toBe(true);
  });

  it('接受非等比 scale {x,y}', () => {
    expect(PathSchema.safeParse(basePath({ scale: { x: 2, y: 0.5 } })).success).toBe(true);
  });

  it('rotate + scale 同时设合法', () => {
    expect(
      PathSchema.safeParse(basePath({ rotate: 30, scale: { x: 1.5, y: 1 } })).success,
    ).toBe(true);
  });

  it('rotate 为 NaN 拒（finite）', () => {
    expect(PathSchema.safeParse(basePath({ rotate: Number.NaN })).success).toBe(false);
  });

  it('scale 为 0 拒', () => {
    expect(PathSchema.safeParse(basePath({ scale: 0 })).success).toBe(false);
  });
});

describe('PathSchema：marks 合法', () => {
  it('接受单个中点 mark', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }] }),
      ).success,
    ).toBe(true);
  });

  it('接受多个 mark + pos 端点 0 / 1', () => {
    expect(
      PathSchema.safeParse(
        basePath({
          marks: [
            { pos: 0, mark: { kind: 'arrow' } },
            { pos: 1, mark: { kind: 'arrow', shape: 'normal' } },
          ],
        }),
      ).success,
    ).toBe(true);
  });

  it('空 marks 数组合法', () => {
    expect(PathSchema.safeParse(basePath({ marks: [] })).success).toBe(true);
  });
});

describe('PathSchema：marks 错误路径', () => {
  it('mark pos 1.5 拒（schema max(1)，非实现钳制）', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: [{ pos: 1.5, mark: { kind: 'arrow', shape: 'stealth' } }] }),
      ).success,
    ).toBe(false);
  });

  it('mark pos -0.1 拒（schema min(0)）', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: [{ pos: -0.1, mark: { kind: 'arrow' } }] }),
      ).success,
    ).toBe(false);
  });

  it('mark.kind 非 arrow 拒', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: [{ pos: 0.5, mark: { kind: 'dot' } }] }),
      ).success,
    ).toBe(false);
  });

  it('mark 缺 pos 拒（结构错）', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: [{ mark: { kind: 'arrow', shape: 'stealth' } }] }),
      ).success,
    ).toBe(false);
  });

  it('marks 非数组拒（结构错）', () => {
    expect(
      PathSchema.safeParse(
        basePath({ marks: { pos: 0.5, mark: { kind: 'arrow' } } }),
      ).success,
    ).toBe(false);
  });

  it('mark 缺 mark 字段拒（结构错）', () => {
    expect(
      PathSchema.safeParse(basePath({ marks: [{ pos: 0.5 }] })).success,
    ).toBe(false);
  });
});

describe('JSON round-trip', () => {
  it('含 out/in bend + path rotate/scale + marks 的 path 序列化往返语义等价', () => {
    const path = {
      type: 'path' as const,
      rotate: 30,
      scale: { x: 1.5, y: 0.8 },
      marks: [
        { pos: 0.5, mark: { kind: 'arrow' as const, shape: 'stealth' } },
        { pos: 0.9, mark: { kind: 'arrow' as const, shape: 'normal', scale: 1.2, color: 'red' } },
      ],
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
        {
          type: 'step' as const,
          kind: 'bend' as const,
          to: { id: 'B' },
          bendDirection: 'left' as const,
          outAngle: 30,
          inAngle: 150,
          looseness: 1.2,
        },
      ],
    };
    const roundTripped = PathSchema.parse(JSON.parse(JSON.stringify(path)));
    expect(roundTripped).toEqual(PathSchema.parse(path));
  });

  it('等比 scale number 往返保持 number 形态', () => {
    const path = basePath({ scale: 2, rotate: 15 });
    expect(PathSchema.parse(JSON.parse(JSON.stringify(path)))).toEqual(PathSchema.parse(path));
  });
});
