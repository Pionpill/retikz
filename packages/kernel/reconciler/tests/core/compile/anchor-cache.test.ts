import { createBoundaryStore } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { CompiledNodeLayout } from '../../../../core/src/compile/node';
import type { ShapeDefinition } from '../../../../core/src/contract';
import { defineShape } from '../../../../core/src/contract';
import { BUILTIN_SHAPES } from '../../../../core/src/providers';
import type { BuiltinShape } from '../../../../core/src/schemas';

/** 构造一个最简 CompiledNodeLayout，rect 已是全局坐标 */
const makeLayout = (
  shape: BuiltinShape = 'rectangle',
  width = 40,
  height = 30,
  cx = 0,
  cy = 0,
  rotate = 0,
): CompiledNodeLayout => {
  // circle / diamond 是内置 shape preset：circle → ellipse 等轴、diamond → polygon 4/0。
  const def =
    shape === 'circle'
      ? BUILTIN_SHAPES.get('ellipse')!
      : shape === 'diamond'
        ? BUILTIN_SHAPES.get('polygon')!
        : BUILTIN_SHAPES.get(shape)!;
  return {
    shape: {
      name: shape,
      definition: def,
      params: shape === 'circle' ? { circumscribe: 'equal' } : shape === 'diamond' ? { sides: 4, rotate: 0 } : {},
    },
    geometry: {
      rect: { x: cx, y: cy, width, height, rotate },
      contentCenter: [cx, cy],
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      contentSize: { width: 0, height: 0 },
    },
    boundary: {
      name: def.name,
      definition: def,
      params: shape === 'circle' ? { circumscribe: 'equal' } : shape === 'diamond' ? { sides: 4, rotate: 0 } : {},
      isShape: true,
    },
  };
};

describe('锚点查询 cache 命中返回同一引用', () => {
  it('anchor_cache_hit_returns_same_reference：keyword 第二次 lookup 返回 === 引用', () => {
    const store = createBoundaryStore();
    const layout = makeLayout();
    const first = store.getOrCreateAnchor(layout, 'top');
    const second = store.getOrCreateAnchor(layout, 'top');

    expect(second).toBe(first);
  });

  it('数字角度第二次 lookup 同样返回 === 引用', () => {
    const store = createBoundaryStore();
    const layout = makeLayout();
    const first = store.getOrCreateAnchor(layout, '30');
    const second = store.getOrCreateAnchor(layout, '30');

    expect(second).toBe(first);
  });
});

describe('锚点查询 不同 key 互不串扰', () => {
  it('anchor_cache_keyword_vs_numeric_isolated：同 layout 上 keyword 与数字角度 cache 互不影响', () => {
    const store = createBoundaryStore();
    const layout = makeLayout();
    const kw = store.getOrCreateAnchor(layout, 'right');
    const num = store.getOrCreateAnchor(layout, '0');

    // right 关键字与 0 度数字角度数值上等价但缓存键不同 → 各自独立存储
    expect(store.getOrCreateAnchor(layout, 'right')).toBe(kw);
    expect(store.getOrCreateAnchor(layout, '0')).toBe(num);

    // 数值上 right 与 .0 都是 (+x, 0) 方向；不强求引用相等（key 不同）
    expect(Math.abs(kw[0] - num[0])).toBeLessThan(1e-6);
    expect(Math.abs(kw[1] - num[1])).toBeLessThan(1e-6);
  });

  it('同 layout 多个 keyword 各自独立缓存', () => {
    const store = createBoundaryStore();
    const layout = makeLayout();
    const n = store.getOrCreateAnchor(layout, 'top');
    const s = store.getOrCreateAnchor(layout, 'bottom');
    const e = store.getOrCreateAnchor(layout, 'right');

    expect(n).not.toBe(s);
    expect(n).not.toBe(e);
    expect(s).not.toBe(e);

    // 各自二次 lookup 仍命中各自 cache
    expect(store.getOrCreateAnchor(layout, 'top')).toBe(n);
    expect(store.getOrCreateAnchor(layout, 'bottom')).toBe(s);
    expect(store.getOrCreateAnchor(layout, 'right')).toBe(e);
  });
});

describe('锚点查询 不同 layout 独立 WeakMap entry', () => {
  it('anchor_cache_different_layouts_isolated：两 layout 各自一份缓存', () => {
    const store = createBoundaryStore();
    const layoutA = makeLayout('rectangle', 40, 30, 0, 0);
    const layoutB = makeLayout('rectangle', 40, 30, 100, 0);
    const aNorth = store.getOrCreateAnchor(layoutA, 'top');
    const bNorth = store.getOrCreateAnchor(layoutB, 'top');

    // 不同 layout → 不同 IRPosition 引用，且各自坐标不同（cx 差 100）
    expect(aNorth).not.toBe(bNorth);
    expect(Math.abs(bNorth[0] - aNorth[0] - 100)).toBeLessThan(1e-6);

    // 各自二次 lookup 仍命中各自 cache（不串）
    expect(store.getOrCreateAnchor(layoutA, 'top')).toBe(aNorth);
    expect(store.getOrCreateAnchor(layoutB, 'top')).toBe(bNorth);
  });
});

describe('锚点查询 多次调用结果一致', () => {
  it('anchor_cache_consistent_across_lookups：同 layout 同 anchor 多次 lookup 都返首调结果', () => {
    const store = createBoundaryStore();
    const layout = makeLayout();
    const first = store.getOrCreateAnchor(layout, 'top-right');

    // 模拟 path 引用 A.top-right 在不同 sub-path / segment 重复触发
    const refs = Array.from({ length: 5 }, () => store.getOrCreateAnchor(layout, 'top-right'));

    for (const r of refs) {
      expect(r).toBe(first);
      expect(r[0]).toBe(first[0]);
      expect(r[1]).toBe(first[1]);
    }
  });
});

describe('锚点查询 各 shape 分发正确', () => {
  it('circle layout 调 anchor 关键字返回圆周点', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const right = store.getOrCreateAnchor(layout, 'right');

    // circle 半径 20 → right 应在 (20, 0)
    expect(right[0]).toBeCloseTo(20, 5);
    expect(right[1]).toBeCloseTo(0, 5);
  });

  it('ellipse layout 调 anchor 关键字返回椭圆周点', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('ellipse', 60, 40, 0, 0);
    const right = store.getOrCreateAnchor(layout, 'right');

    expect(right[0]).toBeCloseTo(30, 5);
    expect(right[1]).toBeCloseTo(0, 5);
  });

  it('diamond (= polygon 4/0) layout 调 anchor 关键字返回外接 AABB 边点', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('diamond', 40, 30, 0, 0);
    const top = store.getOrCreateAnchor(layout, 'top');

    // polygon 命名 anchor 走外接 AABB：top = AABB 上边中点 (0, -height/2) = (0, -15)
    expect(top[0]).toBeCloseTo(0, 5);
    expect(top[1]).toBeCloseTo(-15, 5);
  });
});

describe('锚点查询 数字角度支持负号 / 小数', () => {
  it('负角度作为字符串 key 正确缓存', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const neg = store.getOrCreateAnchor(layout, '-90');

    expect(store.getOrCreateAnchor(layout, '-90')).toBe(neg);

    // -90° = 局部 -y 方向 → 应在 (0, -20)
    expect(neg[0]).toBeCloseTo(0, 5);
    expect(neg[1]).toBeCloseTo(-20, 5);
  });

  it('小数角度作为字符串 key 正确缓存', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('circle', 40, 40, 0, 0);
    const fractional = store.getOrCreateAnchor(layout, '45.5');

    expect(store.getOrCreateAnchor(layout, '45.5')).toBe(fractional);
  });
});

describe('锚点查询 边上比例点', () => {
  it('rect top t=0.5 = 上边中点', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const p = store.getOrCreateAnchor(layout, { side: 'top', fraction: 0.5 });

    expect(p[0]).toBeCloseTo(0, 6);
    expect(p[1]).toBeCloseTo(-5, 6);
  });

  it('缓存命中返回同一引用（key = `${side}:${t}`）', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const first = store.getOrCreateAnchor(layout, { side: 'top', fraction: 0.25 });

    expect(store.getOrCreateAnchor(layout, { side: 'top', fraction: 0.25 })).toBe(first);
  });

  it('与命名 anchor cache key 命名空间不冲突（top vs top:0.5）', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('rectangle', 20, 10, 0, 0);
    const named = store.getOrCreateAnchor(layout, 'top'); // 上边中点 (0,-5)
    const edge = store.getOrCreateAnchor(layout, { side: 'top', fraction: 0 }); // NW 角 (-10,-5)

    expect(named).not.toBe(edge);
    expect(edge[0]).toBeCloseTo(-10, 6);
  });

  it('不支持 edgePoint 的自定义 shape → 抛明确错', () => {
    const store = createBoundaryStore();
    const noEdge: ShapeDefinition = defineShape({
      name: 'noEdge',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
      computeBoundaryPoint: r => [r.x, r.y],
      resolveAnchor: (r, name) => (name === 'center' ? [r.x, r.y] : undefined),
      *emit() {},
    });
    const layout: CompiledNodeLayout = {
      shape: { name: 'custom', definition: noEdge, params: {} },
      geometry: {
        rect: { x: 0, y: 0, width: 20, height: 10, rotate: 0 },
        contentCenter: [0, 0],
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        contentSize: { width: 0, height: 0 },
      },
      boundary: { name: noEdge.name, definition: noEdge, params: {}, isShape: true },
    };

    expect(() => store.getOrCreateAnchor(layout, { side: 'top', fraction: 0.5 })).toThrow(
      /does not support side anchors/,
    );
  });

  it('零尺寸 Coordinate → { side, fraction } 报错（决策细节 #10）', () => {
    const store = createBoundaryStore();
    const layout = makeLayout('rectangle', 0, 0, 5, 5);

    expect(() => store.getOrCreateAnchor(layout, { side: 'top', fraction: 0.5 })).toThrow(/zero-size target/);
  });
});
