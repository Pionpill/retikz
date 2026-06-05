/**
 * Anchor 缓存单元测试
 * @description 覆盖：cache 命中返回严格相等引用；keyword vs 数字角度 cache key 互不串扰；
 *   不同 layout 各自一份缓存；同 layout 多次 lookup 结果一致；数字角度 + 负号 / 小数支持
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { resolveAnchor, resolveEdgePoint } from '../../src/compile/anchor-cache';
import type { NodeLayout } from '../../src/compile/node';
import { BUILTIN_SHAPES, defineShape } from '../../src/shapes';
import type { ShapeDefinition } from '../../src/shapes';
import type { BuiltinShapeName } from '../../src/ir';

/** 构造一个最简 NodeLayout，rect 已是全局坐标 */
const makeLayout = (
  shape: BuiltinShapeName = 'rectangle',
  width = 40,
  height = 30,
  cx = 0,
  cy = 0,
  rotate = 0,
): NodeLayout => {
  // circle 无独立 shapeDef（收为 ellipse 等轴 preset）：解析为 ellipse + circumscribe:'equal'
  const def = shape === 'circle' ? BUILTIN_SHAPES.ellipse : BUILTIN_SHAPES[shape];
  return {
    shapeName: shape,
    shapeDef: def,
    shapeParams: shape === 'circle' ? { circumscribe: 'equal' } : undefined,
    rect: { x: cx, y: cy, width, height, rotate },
    rotateDeg: (rotate * 180) / Math.PI,
    margin: 0,
    textWidth: 0,
    textHeight: 0,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
  };
};

describe('resolveAnchor cache 命中返回同一引用', () => {
  it('anchor_cache_hit_returns_same_reference：keyword 第二次 lookup 返回 === 引用', () => {
    const layout = makeLayout();
    const first = resolveAnchor(layout, 'north');
    const second = resolveAnchor(layout, 'north');
    expect(second).toBe(first);
  });

  it('数字角度第二次 lookup 同样返回 === 引用', () => {
    const layout = makeLayout();
    const first = resolveAnchor(layout, '30');
    const second = resolveAnchor(layout, '30');
    expect(second).toBe(first);
  });
});

describe('resolveAnchor 不同 key 互不串扰', () => {
  it('anchor_cache_keyword_vs_numeric_isolated：同 layout 上 keyword 与数字角度 cache 互不影响', () => {
    const layout = makeLayout();
    const kw = resolveAnchor(layout, 'east');
    const num = resolveAnchor(layout, '0');
    // east 关键字与 0 度数字角度数值上等价但缓存键不同 → 各自独立存储
    expect(resolveAnchor(layout, 'east')).toBe(kw);
    expect(resolveAnchor(layout, '0')).toBe(num);
    // 数值上 east 与 .0 都是 (+x, 0) 方向；不强求引用相等（key 不同）
    expect(Math.abs(kw[0] - num[0])).toBeLessThan(1e-6);
    expect(Math.abs(kw[1] - num[1])).toBeLessThan(1e-6);
  });

  it('同 layout 多个 keyword 各自独立缓存', () => {
    const layout = makeLayout();
    const n = resolveAnchor(layout, 'north');
    const s = resolveAnchor(layout, 'south');
    const e = resolveAnchor(layout, 'east');
    expect(n).not.toBe(s);
    expect(n).not.toBe(e);
    expect(s).not.toBe(e);
    // 各自二次 lookup 仍命中各自 cache
    expect(resolveAnchor(layout, 'north')).toBe(n);
    expect(resolveAnchor(layout, 'south')).toBe(s);
    expect(resolveAnchor(layout, 'east')).toBe(e);
  });
});

describe('resolveAnchor 不同 layout 独立 WeakMap entry', () => {
  it('anchor_cache_different_layouts_isolated：两 layout 各自一份缓存', () => {
    const layoutA = makeLayout('rectangle', 40, 30, 0, 0);
    const layoutB = makeLayout('rectangle', 40, 30, 100, 0);
    const aNorth = resolveAnchor(layoutA, 'north');
    const bNorth = resolveAnchor(layoutB, 'north');
    // 不同 layout → 不同 IRPosition 引用，且各自坐标不同（cx 差 100）
    expect(aNorth).not.toBe(bNorth);
    expect(Math.abs(bNorth[0] - aNorth[0] - 100)).toBeLessThan(1e-6);
    // 各自二次 lookup 仍命中各自 cache（不串）
    expect(resolveAnchor(layoutA, 'north')).toBe(aNorth);
    expect(resolveAnchor(layoutB, 'north')).toBe(bNorth);
  });
});

describe('resolveAnchor 多次调用结果一致', () => {
  it('anchor_cache_consistent_across_lookups：同 layout 同 anchor 多次 lookup 都返首调结果', () => {
    const layout = makeLayout();
    const first = resolveAnchor(layout, 'north-east');
    // 模拟 path 引用 A.north-east 在不同 sub-path / segment 重复触发
    const refs = Array.from({ length: 5 }, () => resolveAnchor(layout, 'north-east'));
    for (const r of refs) {
      expect(r).toBe(first);
      expect(r[0]).toBe(first[0]);
      expect(r[1]).toBe(first[1]);
    }
  });
});

describe('resolveAnchor 各 shape 分发正确', () => {
  it('circle layout 调 anchor 关键字返回圆周点', () => {
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const east = resolveAnchor(layout, 'east');
    // circle 半径 20 → east 应在 (20, 0)
    expect(east[0]).toBeCloseTo(20, 5);
    expect(east[1]).toBeCloseTo(0, 5);
  });

  it('ellipse layout 调 anchor 关键字返回椭圆周点', () => {
    const layout = makeLayout('ellipse', 60, 40, 0, 0);
    const east = resolveAnchor(layout, 'east');
    expect(east[0]).toBeCloseTo(30, 5);
    expect(east[1]).toBeCloseTo(0, 5);
  });

  it('diamond layout 调 anchor 关键字返回顶点', () => {
    const layout = makeLayout('diamond', 40, 30, 0, 0);
    const north = resolveAnchor(layout, 'north');
    // diamond north 在 y = -halfB
    expect(north[0]).toBeCloseTo(0, 5);
    expect(north[1]).toBeCloseTo(-15, 5);
  });
});

describe('resolveAnchor 数字角度支持负号 / 小数', () => {
  it('负角度作为字符串 key 正确缓存', () => {
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const neg = resolveAnchor(layout, '-90');
    expect(resolveAnchor(layout, '-90')).toBe(neg);
    // -90° = 局部 -y 方向 → 应在 (0, -20)
    expect(neg[0]).toBeCloseTo(0, 5);
    expect(neg[1]).toBeCloseTo(-20, 5);
  });

  it('小数角度作为字符串 key 正确缓存', () => {
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const fractional = resolveAnchor(layout, '45.5');
    expect(resolveAnchor(layout, '45.5')).toBe(fractional);
  });
});

describe('resolveEdgePoint 边上比例点（ADR-02）', () => {
  it('rect north t=0.5 = 上边中点', () => {
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const p = resolveEdgePoint(layout, 'north', 0.5);
    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(-5, 6);
  });

  it('缓存命中返回同一引用（key = `${side}:${t}`）', () => {
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const first = resolveEdgePoint(layout, 'north', 0.25);
    expect(resolveEdgePoint(layout, 'north', 0.25)).toBe(first);
  });

  it('与命名 anchor cache key 命名空间不冲突（north vs north:0.5）', () => {
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const named = resolveAnchor(layout, 'north'); // 上边中点 (0,-5)
    const edge = resolveEdgePoint(layout, 'north', 0); // NW 角 (-10,-5)
    expect(named).not.toBe(edge);
    expect(edge[0]).toBeCloseTo(-10, 6);
  });

  it('不支持 edgePoint 的自定义 shape → 抛明确错', () => {
    const noEdge: ShapeDefinition = defineShape({
      paramsSchema: z.strictObject({}),
      circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
      boundaryPoint: r => [r.x, r.y],
      anchor: (r, name) => (name === 'center' ? [r.x, r.y] : undefined),
      *emit() {},
    });
    const layout: NodeLayout = {
      shapeName: 'custom',
      shapeDef: noEdge,
      rect: { x: 0, y: 0, width: 20, height: 10, rotate: 0 },
      rotateDeg: 0,
      margin: 0,
      textWidth: 0,
      textHeight: 0,
      align: 'middle',
      lineHeight: 0,
      fontSize: 0,
    };
    expect(() => resolveEdgePoint(layout, 'north', 0.5)).toThrow(/does not support side anchors/);
  });

  it('零尺寸 Coordinate → { side, t } 报错（决策细节 #10）', () => {
    const layout = makeLayout('rectangle', 0, 0, 5, 5);
    expect(() => resolveEdgePoint(layout, 'north', 0.5)).toThrow(/zero-size Coordinate/);
  });
});
