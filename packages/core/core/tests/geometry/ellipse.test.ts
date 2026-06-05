import { describe, expect, it } from 'vitest';
import { type Ellipse, ellipse } from '../../src/geometry/ellipse';
import { ellipse as ellipseShape } from '../../src/shapes';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const e: Ellipse = { x: 0, y: 0, rx: 10, ry: 5 };

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

describe('ellipse.center', () => {
  it('中心 = (x, y)', () => {
    expect(ellipse.center({ x: 3, y: 7, rx: 4, ry: 2 })).toEqual([3, 7]);
  });
});

describe('ellipse.contains', () => {
  it('中心 / 4 个轴端点在内', () => {
    expect(ellipse.contains(e, [0, 0])).toBe(true);
    expect(ellipse.contains(e, [10, 0])).toBe(true);
    expect(ellipse.contains(e, [-10, 0])).toBe(true);
    expect(ellipse.contains(e, [0, 5])).toBe(true);
    expect(ellipse.contains(e, [0, -5])).toBe(true);
  });

  it('外部点 false', () => {
    expect(ellipse.contains(e, [10.01, 0])).toBe(false);
    expect(ellipse.contains(e, [8, 4])).toBe(false); // 8²/100 + 4²/25 = 0.64 + 0.64 = 1.28 > 1
  });
});

describe('ellipse.anchor', () => {
  it('4 轴端点对应 N / S / E / W', () => {
    expect(ellipse.anchor(e, 'east')).toEqual([10, 0]);
    expect(ellipse.anchor(e, 'west')).toEqual([-10, 0]);
    expect(ellipse.anchor(e, 'north')).toEqual([0, -5]);
    expect(ellipse.anchor(e, 'south')).toEqual([0, 5]);
  });

  it('对角 anchor 取参数 t=π/4 处：(rx/√2, ry/√2)', () => {
    const ne = ellipse.anchor(e, 'north-east');
    expect(ne[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(ne[1]).toBeCloseTo(-5 * Math.SQRT1_2);
  });
});

describe('ellipse.boundaryPoint', () => {
  it('沿 +x → east', () => {
    const p = ellipse.boundaryPoint(e, [100, 0]);
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(0);
  });

  it('沿 +y → south', () => {
    const p = ellipse.boundaryPoint(e, [0, 100]);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(5);
  });

  it('交点满足椭圆方程 (x/rx)² + (y/ry)² = 1', () => {
    for (const toward of [
      [3, 4],
      [-7, 1],
      [0.5, -100],
    ] as Array<[number, number]>) {
      const p = ellipse.boundaryPoint(e, toward);
      const v = (p[0] / e.rx) ** 2 + (p[1] / e.ry) ** 2;
      expect(v).toBeCloseTo(1);
    }
  });
});

describe('ellipse shape — circumscribe 策略', () => {
  it('ellipse_proportional_default：无 params → 各轴 ×√2（现状）', () => {
    expect(ellipseShape.circumscribe(10, 4, {})).toEqual({
      halfWidth: 10 * Math.SQRT2,
      halfHeight: 4 * Math.SQRT2,
    });
  });

  it('ellipse_proportional_default：显式 proportional 与无 params 一致', () => {
    expect(ellipseShape.circumscribe(10, 4, { circumscribe: 'proportional' })).toEqual(
      ellipseShape.circumscribe(10, 4, {}),
    );
  });

  it('ellipse_equal_isotropic：equal → halfWidth = halfHeight = √(hw²+hh²)', () => {
    const r = Math.hypot(10, 4);
    expect(ellipseShape.circumscribe(10, 4, { circumscribe: 'equal' })).toEqual({
      halfWidth: r,
      halfHeight: r,
    });
  });

  it('square_inner_box_equal_equals_proportional_point：正方内框（hw=hh）下 equal 与 proportional 半轴重合（均 = √2·hw）', () => {
    const prop = ellipseShape.circumscribe(8, 8, { circumscribe: 'proportional' });
    const equal = ellipseShape.circumscribe(8, 8, { circumscribe: 'equal' });
    // proportional: 8·√2；equal: √(8²+8²) = 8·√2 —— 数值重合
    expect(prop.halfWidth).toBeCloseTo(8 * Math.SQRT2);
    expect(equal.halfWidth).toBeCloseTo(8 * Math.SQRT2);
    expect(equal).toEqual(prop);
  });

  it('flat_inner_box_equal_uses_diagonal：极扁内框 equal → 半径取对角线半长（不退化为某轴）', () => {
    const { halfWidth, halfHeight } = ellipseShape.circumscribe(100, 1, { circumscribe: 'equal' });
    const diagonal = Math.hypot(100, 1);
    expect(halfWidth).toBe(halfHeight); // 等轴
    expect(halfWidth).toBeCloseTo(diagonal);
    expect(halfWidth).toBeGreaterThan(100); // 严格大于长轴，未退化
  });

  it('invalid_circumscribe_enum_rejected：{circumscribe:"foo"} → paramsSchema reject', () => {
    expect(ellipseShape.paramsSchema.safeParse({ circumscribe: 'foo' }).success).toBe(false);
  });

  it('proportional / equal / 空对象均通过 paramsSchema', () => {
    expect(ellipseShape.paramsSchema.parse({})).toEqual({});
    expect(ellipseShape.paramsSchema.parse({ circumscribe: 'proportional' })).toEqual({
      circumscribe: 'proportional',
    });
    expect(ellipseShape.paramsSchema.parse({ circumscribe: 'equal' })).toEqual({
      circumscribe: 'equal',
    });
  });

  it('strictObject 拒绝多余字段', () => {
    expect(ellipseShape.paramsSchema.safeParse({ circumscribe: 'equal', foo: 1 }).success).toBe(
      false,
    );
  });
});

describe('ellipse shape — equal × Node 变换交互', () => {
  it('ellipse_equal_with_rotate：equal × rotate → 仍 emit ellipse 且 rx == ry（等轴）', () => {
    const ir = scene([
      {
        type: 'node',
        id: 'A',
        position: [0, 0],
        shape: { type: 'ellipse', params: { circumscribe: 'equal' } },
        rotate: 30,
        text: 'long text',
      },
    ]);
    const compiled = compileToScene(ir);
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el).toBeDefined();
    // equal 策略 → 等轴外接 → rx == ry，即使内框非正方
    expect(el!.rx).toBe(el!.ry);
  });

  it('proportional × 宽文本 → rx > ry（与 equal 区分）', () => {
    const ir = scene([
      {
        type: 'node',
        id: 'A',
        position: [0, 0],
        shape: { type: 'ellipse', params: { circumscribe: 'proportional' } },
        text: 'long text',
      },
    ]);
    const compiled = compileToScene(ir);
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.rx).toBeGreaterThan(el!.ry);
  });
});
