/**
 * compile + scope 集成测试
 * @description 只覆盖 scope.transforms 4 个 translate 变体 lower + 累积 chain、嵌套 scope、prune、跨 scope path 引用、scope.transforms 失败时的 warn
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { CompileWarning, GroupPrim, IR, ScenePrimitive, Transform } from '../../src';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

/** 第一层 GroupPrim（顶层第一个 scope 对应的 group），便于断言其 transforms */
const findTopScopeGroup = (
  primitives: ReadonlyArray<ScenePrimitive>,
): GroupPrim | undefined => {
  for (const p of primitives) {
    if (p.type === 'group') return p;
  }
  return undefined;
};

/** 判断 GroupPrim 是 "scope 产生的" vs "node rotate 产生的"：node rotate group 的 transforms 一定是 rotate；这里只选 translate/scale */
const findScopeStyleGroup = (
  primitives: ReadonlyArray<ScenePrimitive>,
  predicate: (transforms: ReadonlyArray<Transform>) => boolean,
): GroupPrim | undefined => {
  for (const p of primitives) {
    if (p.type === 'group' && p.transforms && predicate(p.transforms)) {
      return p;
    }
  }
  return undefined;
};

describe('scope.transforms lower 后生成 GroupPrim 的 Cartesian transforms 正确', () => {
  it('translate 直接透传到 group.transforms', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 50, y: 30 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    expect(group?.transforms).toEqual([{ kind: 'translate', x: 50, y: 30 }]);
  });

  it('polar-translate(0, 50) → translate(50, 0)', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'polar-translate', angle: 0, radius: 50 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    expect(group?.transforms).toHaveLength(1);
    const t = group?.transforms?.[0] as { x: number; y: number; kind: string };
    expect(t.kind).toBe('translate');
    expect(t.x).toBeCloseTo(50, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 含 origin=string id → 投影后 translate', () => {
    const ir = scene([
      { type: 'node', id: 'hub', position: [10, 0], text: 'H' },
      {
        type: 'scope',
        transforms: [{ kind: 'polar-translate', origin: 'hub', angle: 0, radius: 30 }],
        children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findScopeStyleGroup(
      compiled.primitives,
      ts => ts[0]?.kind === 'translate',
    );
    const t = group?.transforms?.[0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(40, 6);
    expect(t.y).toBeCloseTo(0, 6);
  });

  it('polar-translate 含 origin=笛卡尔字面量', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'polar-translate', origin: [10, 5], angle: 90, radius: 20 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    const t = group?.transforms?.[0] as { x: number; y: number };
    expect(t.x).toBeCloseTo(10, 6);
    expect(t.y).toBeCloseTo(25, 6);
  });

  it('at-translate(right of A, distance=20) → translate(20, 0)', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'at-translate', direction: 'right', of: 'A', distance: 20 }],
        children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findScopeStyleGroup(
      compiled.primitives,
      ts => ts[0]?.kind === 'translate',
    );
    expect(group?.transforms?.[0]).toEqual({ kind: 'translate', x: 20, y: 0 });
  });

  it('at-translate 缺 distance 走 CompileOption.nodeDistance', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'at-translate', direction: 'above', of: 'A' }],
        children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
      },
    ]);
    const compiled = compileToScene(ir, { nodeDistance: 15 });
    const group = findScopeStyleGroup(
      compiled.primitives,
      ts => ts[0]?.kind === 'translate',
    );
    // above direction = y -15
    expect(group?.transforms?.[0]).toEqual({ kind: 'translate', x: 0, y: -15 });
  });

  it('offset-translate(of A, offset=[10, 5]) → translate(10, 5)', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'offset-translate', of: 'A', offset: [10, 5] }],
        children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findScopeStyleGroup(
      compiled.primitives,
      ts => ts[0]?.kind === 'translate',
    );
    expect(group?.transforms?.[0]).toEqual({ kind: 'translate', x: 10, y: 5 });
  });

  it('offset-translate 缺 offset → translate = referent 全局坐标', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [100, 100], text: 'A' },
      {
        type: 'scope',
        transforms: [{ kind: 'offset-translate', of: 'A' }],
        children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findScopeStyleGroup(
      compiled.primitives,
      ts => ts[0]?.kind === 'translate',
    );
    expect(group?.transforms?.[0]).toEqual({ kind: 'translate', x: 100, y: 100 });
  });

  it('scope rotate 透传到 GroupPrim.transforms', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    expect(group?.transforms).toEqual([{ kind: 'rotate', degrees: 45 }]);
  });

  it('scope scale 透传到 GroupPrim.transforms', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 2 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    expect(group?.transforms).toEqual([{ kind: 'scale', x: 2 }]);
  });
});

describe('scope nested compose', () => {
  it('嵌套 scope translate 复合：外 translate + 内 translate 各自一层 GroupPrim', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 50, y: 0 }],
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 10, y: 0 }],
            children: [{ type: 'node', id: 'inside', position: [0, 0], text: 'I' }],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const outer = findTopScopeGroup(compiled.primitives);
    expect(outer?.transforms).toEqual([{ kind: 'translate', x: 50, y: 0 }]);
    const inner = outer?.children.find(c => c.type === 'group');
    expect(inner).toBeDefined();
    if (inner?.type === 'group') {
      expect(inner.transforms).toEqual([{ kind: 'translate', x: 10, y: 0 }]);
    }
  });

  it('3 层 scope translate 嵌套各自 emit 一层 GroupPrim', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 50, y: 0 }],
            children: [
              {
                type: 'scope',
                transforms: [{ kind: 'translate', x: 25, y: 0 }],
                children: [{ type: 'node', id: 'deep', position: [0, 0], text: 'D' }],
              },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const l1 = findTopScopeGroup(compiled.primitives);
    expect(l1?.transforms?.[0]).toEqual({ kind: 'translate', x: 100, y: 0 });
    const l2 = l1?.children.find(c => c.type === 'group');
    expect(l2).toBeDefined();
    if (l2?.type === 'group') {
      expect(l2.transforms?.[0]).toEqual({ kind: 'translate', x: 50, y: 0 });
      const l3 = l2.children.find(c => c.type === 'group');
      expect(l3).toBeDefined();
      if (l3?.type === 'group') {
        expect(l3.transforms?.[0]).toEqual({ kind: 'translate', x: 25, y: 0 });
      }
    }
  });

  it('scope 内 node 在 nodeIndex 注册的是全局坐标（chain 累积后）', () => {
    // 通过 outer path 引用内层 node 验证：path line 端点 ≈ 全局坐标（容忍 boundary clip）
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      { type: 'node', id: 'external', position: [0, 200], text: 'E' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'external' },
          { type: 'step', kind: 'line', to: 'A' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    // 顶层有 path（path 在顶层 scope 外面）
    const topPath = compiled.primitives.find(p => p.type === 'path');
    expect(topPath).toBeDefined();
    if (topPath?.type === 'path') {
      const lineCmd = topPath.commands.find(c => c.kind === 'line');
      // line endpoint approaches A boundary; A 全局中心 (100, 0)，boundary clip 偏移最多 ~半宽
      if (lineCmd?.kind === 'line') {
        expect(Math.abs(lineCmd.to[0] - 100)).toBeLessThan(20);
      }
    }
  });
});

describe('scope GroupPrim emit 形态', () => {
  it('单层 scope 顶层 primitive 含一个 group + 子 primitives 嵌在内', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [5, 0], text: 'B' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const groups = compiled.primitives.filter(p => p.type === 'group');
    expect(groups).toHaveLength(1);
    const rects = flattenPrims(groups[0].children).filter(c => c.type === 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(2);
  });

  it('scope 内 path 落到顶层 primitives，不进 scope 的 GroupPrim', () => {
    // path 端点用 nodeIndex 全局坐标解析后几何已是全局；若落到 GroupPrim 会被 scope.transform 再 apply 一次造成视觉偏移翻倍
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [30, 0], text: 'B' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: 'A' },
              { type: 'step', kind: 'line', to: 'B' },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const topPath = compiled.primitives.find(p => p.type === 'path');
    expect(topPath).toBeDefined();
    const group = compiled.primitives.find(p => p.type === 'group');
    if (group?.type === 'group') {
      const innerPath = group.children.find(c => c.type === 'path');
      expect(innerPath).toBeUndefined();
    }
    if (topPath?.type === 'path') {
      const moveCmd = topPath.commands.find(c => c.kind === 'move');
      const lineCmd = topPath.commands.find(c => c.kind === 'line');
      if (moveCmd?.kind === 'move') {
        // A 全局中心 (10, 0)，boundary clip 偏移最多 ~半宽
        expect(Math.abs(moveCmd.to[0] - 10)).toBeLessThan(20);
      }
      if (lineCmd?.kind === 'line') {
        // B 全局中心 (40, 0)，boundary clip 偏移最多 ~半宽
        expect(Math.abs(lineCmd.to[0] - 40)).toBeLessThan(20);
      }
    }
  });

  it('scope 内 node primitive 用 局部 坐标 + GroupPrim transform 链', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 50, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    if (group?.type === 'group') {
      const rect = flattenPrims(group.children).find(c => c.type === 'rect');
      expect(rect).toBeDefined();
      if (rect?.type === 'rect') {
        // node 中心 = 局部 0,0；rect.x = 左上角 = -halfW < 0
        expect(rect.x).toBeLessThan(0);
        // 如果用了全局坐标 rect 中心会在 50，rect.x 会 > 30；这里应该明显小于 30
        expect(rect.x).toBeLessThan(30);
      }
    }
  });

  it('polar-translate 在 Scene 中已下沉为 Cartesian translate（不出现 polar-translate kind）', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'polar-translate', angle: 30, radius: 50 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = findTopScopeGroup(compiled.primitives);
    expect(group?.transforms).toHaveLength(1);
    expect(group?.transforms?.[0].kind).toBe('translate');
  });

  it('scope scale 下 path 端点 boundary clip 按缩放后的矩形对齐', () => {
    // scope scale 1.5 + 内 path 串联两节点；boundary clip 应按 1.5x 的视觉尺寸算
    // s1.east 视觉位置 = s1.center.x + halfWidth * 1.5；line 起点应接近此点
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'scale', x: 1.5 }],
        children: [
          { type: 'node', id: 's1', position: [0, 0], text: '1' },
          { type: 'node', id: 's2', position: [100, 0], text: '2' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: 's1' },
              { type: 'step', kind: 'line', to: 's2' },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const path = compiled.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
    if (path?.type === 'path') {
      const moveCmd = path.commands.find(c => c.kind === 'move');
      const lineCmd = path.commands.find(c => c.kind === 'line');
      // s1 视觉中心 = (0, 0)；s2 视觉中心 = (150, 0)；视觉 halfWidth ≈ 同 fallback measure 下 1.5x 原本宽度
      // 旧实现（未把 scale 投到 rect.width）会让 clip 落在 1x halfWidth 处，距视觉边界明显内移
      // 这里取近似断言：move 端点距 s1 中心 > 0（贴边而非中心）；line 端点距 s2 中心 > 0；
      // 且 move.x 与 line.x 之差 < |s2.center - s1.center| = 150（两端各自向内 clip）
      if (moveCmd?.kind === 'move' && lineCmd?.kind === 'line') {
        expect(moveCmd.to[0]).toBeGreaterThan(0);
        expect(lineCmd.to[0]).toBeLessThan(150);
        // 关键回归：旧实现下 move.x ≈ 1x halfWidth；新实现下 ≈ 1.5x halfWidth → 必然 > 1.2x halfWidth
        // 这里用 "扣除两端 clip 后剩下的中段长度" 与 "1x 视觉间距" 比较——新实现 < 旧实现
        const midSegment = lineCmd.to[0] - moveCmd.to[0];
        // 旧实现下 midSegment ≈ 150 - 2 * halfWidth_1x；新实现下 ≈ 150 - 2 * halfWidth_1.5x → 新更短
        // 取严格上界："如果 scale 未投到 width，midSegment 至少是 150 - 2*1.2*halfWidth_default ~ 130"
        // 新实现 midSegment 应明显 < 130（halfWidth_default 约 15，1.5x = 22.5，midSegment ≈ 150 - 45 = 105）
        expect(midSegment).toBeLessThan(130);
      }
    }
  });

  it('chain [translate, rotate] 与 SVG transform 渲染语义一致：array[0]=外层、array[last]=内层', () => {
    // SVG `transform="translate(100 0) rotate(90)"` 对 local (10, 0):
    //   rotate(90)·(10, 0) = (0, 10)
    //   translate(100, 0)·(0, 10) = (100, 10)
    // 外层 path 引用 inner，端点应取 (100, 10) ± boundary clip——验证 nodeIndex 全局坐标和 SVG 渲染口径一致，
    // 防止 path（顶层走 nodeIndex）与 node（GroupPrim 包局部坐标交给 SVG 渲染）之间漂移
    const ir = scene([
      {
        type: 'scope',
        transforms: [
          { kind: 'translate', x: 100, y: 0 },
          { kind: 'rotate', degrees: 90 },
        ],
        children: [{ type: 'node', id: 'inner', position: [10, 0], text: 'I' }],
      },
      { type: 'node', id: 'ext', position: [0, 0], text: 'E' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'ext' },
          { type: 'step', kind: 'line', to: 'inner' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const path = compiled.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
    if (path?.type === 'path') {
      const lineCmd = path.commands.find(c => c.kind === 'line');
      if (lineCmd?.kind === 'line') {
        // 端点 ≈ (100, 10) ± boundary clip; 若 chain apply 顺序反了，端点会是 (110, 0)
        expect(Math.abs(lineCmd.to[0] - 100)).toBeLessThan(20);
        expect(Math.abs(lineCmd.to[1] - 10)).toBeLessThan(20);
      }
    }
  });
});

describe('scope 跨 scope path 引用', () => {
  it('外层 path 引用 scope 内 node A → 端点取 A 的全局坐标', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 100, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      { type: 'node', id: 'external', position: [0, 100], text: 'E' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'external' },
          { type: 'step', kind: 'line', to: 'A' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const path = compiled.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
    if (path?.type === 'path') {
      const lineCmd = path.commands.find(c => c.kind === 'line');
      // line 终点 ≈ A 全局中心 (100, 0)，boundary clip 偏移最多 ~半宽
      if (lineCmd?.kind === 'line') {
        expect(Math.abs(lineCmd.to[0] - 100)).toBeLessThan(20);
      }
    }
  });

  it('scope 内 coordinate 跨 scope 也可被外层 path 引用（无形状 boundary clip 为中心点）', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 60, y: 0 }],
        children: [{ type: 'coordinate', id: 'anchor', position: [0, 0] }],
      },
      { type: 'node', id: 'B', position: [0, 100], text: 'B' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: 'B' },
          { type: 'step', kind: 'line', to: 'anchor' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const path = compiled.primitives.find(p => p.type === 'path');
    if (path?.type === 'path') {
      const lineCmd = path.commands.find(c => c.kind === 'line');
      // coordinate 是 0×0 rect → boundary 中心 = (60, 0)
      if (lineCmd?.kind === 'line') {
        expect(lineCmd.to[0]).toBeCloseTo(60, 1);
      }
    }
  });
});

describe('scope empty / prune 行为', () => {
  it('空 scope（无 children / 无 transforms / 无 id）不 emit GroupPrim', () => {
    const ir = scene([
      { type: 'scope', children: [] },
      // 纯几何节点（无文本、无 rotate）不外裹 group——隔离出"空 scope 是否产 group"的判定
      { type: 'node', id: 'A', position: [0, 0] },
    ]);
    const compiled = compileToScene(ir);
    const groups = compiled.primitives.filter(p => p.type === 'group');
    // 空 scope 不产 group；纯几何 node 平铺不产 group，所以总数 = 0
    expect(groups).toHaveLength(0);
  });

  it('空 children + 非空 transforms → 仍 emit GroupPrim（保留 transform 语义）', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = compiled.primitives.find(p => {
      if (p.type !== 'group') return false;
      const t = p.transforms?.[0];
      return t?.kind === 'translate' && t.x === 10;
    });
    expect(group).toBeDefined();
    if (group?.type === 'group') {
      expect(group.children).toEqual([]);
    }
  });

  it('scope.transforms = 空数组 等价 undefined（不带 transforms 字段）但有 children → emit group', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const groups = compiled.primitives.filter(p => p.type === 'group');
    // 空 transforms + 非空 children → 仍 emit；transforms 字段缺省
    const scopeGroup = groups.find(
      g => g.transforms === undefined || g.transforms.length === 0,
    );
    expect(scopeGroup).toBeDefined();
  });

  it('scope.transforms = undefined 且 children 非空 → emit group 但 transforms 缺省', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const group = compiled.primitives.find(p => p.type === 'group');
    expect(group).toBeDefined();
    if (group?.type === 'group') {
      expect(group.transforms).toBeUndefined();
    }
  });
});

describe('scope.transforms 解析失败 warn', () => {
  it('at-translate of 未定义触发 AT_TARGET_UNRESOLVED', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'at-translate', direction: 'right', of: 'missing' }],
        children: [],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'AT_TARGET_UNRESOLVED')).toBe(true);
  });

  it('offset-translate of=string 未定义触发 OFFSET_BASE_UNRESOLVED', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'offset-translate', of: 'missing', offset: [5, 0] }],
        children: [],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toBe(true);
  });

  it('polar-translate origin=string 未定义触发 POLAR_ORIGIN_UNRESOLVED', () => {
    const ir = scene([
      {
        type: 'scope',
        transforms: [{ kind: 'polar-translate', origin: 'missing', angle: 0, radius: 10 }],
        children: [],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'POLAR_ORIGIN_UNRESOLVED')).toBe(true);
  });
});

describe('scope.id synthetic bbox 注册', () => {
  it('scope 接受 id 字段而不破坏 compile（synthetic bbox layout 注册到父 frame）', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'cluster',
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 80] },
          { type: 'step', kind: 'line', to: 'cluster' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    // path 端点应被解析为 cluster bbox 中心（≈ 子 node A 的全局中心，即 translate(10,0)）
    const path = compiled.primitives.find(p => p.type === 'path');
    expect(path).toBeDefined();
  });
});

describe('同 frame 重复 id 触发 DUPLICATE_NODE_ID warn + last-wins', () => {
  it('duplicate_same_frame_two_nodes_warn_last_wins：两个同 id node → 1 条 warn，nodeIndex 取 second', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'first' },
      { type: 'node', id: 'A', position: [50, 0], text: 'second' },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, -60] },
          { type: 'step', kind: 'line', to: 'A' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups).toHaveLength(1);
    expect(dups[0].message).toContain("'A'");
    expect(dups[0].path).toContain('children[1].node.id');
    // last-wins：path 端点应接近 second 全局中心 (50, 0)
    const path = compiled.primitives.find(p => p.type === 'path');
    if (path?.type === 'path') {
      const ln = path.commands.find(c => c.kind === 'line');
      if (ln?.kind === 'line') {
        expect(Math.abs(ln.to[0] - 50)).toBeLessThan(20);
      }
    }
  });

  it('duplicate_same_frame_node_vs_coordinate_warn：node + coordinate 同 id → 1 条 warn', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'first' },
      { type: 'coordinate', id: 'A', position: [100, 0] },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups).toHaveLength(1);
    expect(dups[0].path).toContain('coordinate.id');
  });

  it('duplicate_same_frame_node_vs_scope_id_warn：node + scope.id 同名 → 1 条 warn', () => {
    const ir = scene([
      { type: 'scope', id: 'X', children: [{ type: 'node', id: 'inner', position: [0, 0], text: 'i' }] },
      { type: 'node', id: 'X', position: [50, 0], text: 'X' },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups).toHaveLength(1);
  });

  it('duplicate_same_frame_three_times_warn_each：三个同 id → 2 条 warn（N - 1）', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: '1' },
      { type: 'node', id: 'A', position: [10, 0], text: '2' },
      { type: 'node', id: 'A', position: [20, 0], text: '3' },
    ]);
    const warnings: Array<CompileWarning> = [];
    compileToScene(ir, { onWarn: w => warnings.push(w) });
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups).toHaveLength(2);
    expect(dups[0].path).toContain('children[1].node.id');
    expect(dups[1].path).toContain('children[2].node.id');
  });

  it('duplicate 不抛错；compile 仍正常完成', () => {
    const ir = scene([
      { type: 'node', id: 'A', position: [0, 0], text: 'first' },
      { type: 'node', id: 'A', position: [50, 0], text: 'second' },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).not.toThrow();
  });
});

describe('scope 内前向引用规则', () => {
  it('scope_forward_ref_within_scope_rejected：scope 内 polar.origin → 后定义 id → 解析失败抛错（与 v0.1 一致）', () => {
    const ir = scene([
      {
        type: 'scope',
        children: [
          { type: 'node', id: 'A', position: { origin: 'B', angle: 0, radius: 10 }, text: 'A' },
          { type: 'node', id: 'B', position: [0, 0], text: 'B' },
        ],
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow();
  });
});
