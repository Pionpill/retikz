/**
 * scope.id synthetic bounding-box layout 注册测试
 * @description scope.id 设值时 Pass 1 子树结束后算 axis-aligned 全局 bbox，注册为 synthetic rectangle NodeLayout 到父 namespace frame。
 *   外部 path 用 `'g'` / `'g.<anchor>'` / `'g.<deg>'` 引用走与普通 rectangle node 完全一致的 anchor 路径；
 *   scope.id 作为 polar / at / offset referent 取 bbox 中心。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import {
  computeScopeBoundingBox,
  registerScopeAsLayout,
} from '../../src/compile/scope';
import type { CompileWarning, IR, ScenePrimitive } from '../../src';
import type { NodeLayout } from '../../src/compile/node';
import type { TextMeasurer } from '../../src/compile/text-metrics';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});

const topPath = (prims: ReadonlyArray<ScenePrimitive>): ScenePrimitive | undefined =>
  prims.find(p => p.type === 'path');

const lineTo = (prim: ScenePrimitive | undefined): [number, number] | undefined => {
  if (!prim || prim.type !== 'path') return undefined;
  for (const cmd of prim.commands) {
    if (cmd.kind === 'line') return cmd.to;
  }
  return undefined;
};

/** 构造一个 width/height 已知、中心已知的 0-rotate 测试 layout，供 computeScopeBoundingBox 单元测试 */
const layoutAt = (cx: number, cy: number, w: number, h: number): NodeLayout => ({
  id: 'test',
  shape: 'rectangle',
  rect: { x: cx, y: cy, width: w, height: h, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: w,
  textHeight: h,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
});

describe('computeScopeBoundingBox / registerScopeAsLayout 单元测试', () => {
  it('空 layouts → 返回 null', () => {
    expect(computeScopeBoundingBox([])).toBeNull();
  });

  it('3 个 0×0 单点 layout → bbox 包 3 点的 AABB', () => {
    const bbox = computeScopeBoundingBox([
      layoutAt(0, 0, 0, 0),
      layoutAt(40, 30, 0, 0),
      layoutAt(80, -20, 0, 0),
    ]);
    expect(bbox).not.toBeNull();
    // x 范围 [0, 80]，y 范围 [-20, 30]
    expect(bbox!.x).toBeCloseTo(40, 5);
    expect(bbox!.y).toBeCloseTo(5, 5);
    expect(bbox!.width).toBeCloseTo(80, 5);
    expect(bbox!.height).toBeCloseTo(50, 5);
  });

  it('单 layout (10,20) 30×40 → bbox 就是该 layout', () => {
    const bbox = computeScopeBoundingBox([layoutAt(10, 20, 30, 40)]);
    expect(bbox).not.toBeNull();
    expect(bbox!.x).toBeCloseTo(10, 5);
    expect(bbox!.y).toBeCloseTo(20, 5);
    expect(bbox!.width).toBeCloseTo(30, 5);
    expect(bbox!.height).toBeCloseTo(40, 5);
  });

  it('registerScopeAsLayout(bbox=null, fallback) → 0×0 占位 layout 落在 fallback 点', () => {
    const layout = registerScopeAsLayout('g', null, [50, 50]);
    expect(layout.id).toBe('g');
    expect(layout.shape).toBe('rectangle');
    expect(layout.rect.x).toBe(50);
    expect(layout.rect.y).toBe(50);
    expect(layout.rect.width).toBe(0);
    expect(layout.rect.height).toBe(0);
    expect(layout.rect.rotate).toBe(0);
    expect(layout.margin).toBe(0);
    expect(layout.fontSize).toBe(0);
  });

  it('registerScopeAsLayout(bbox=有效) → rect 字段反映 bbox', () => {
    const layout = registerScopeAsLayout(
      'g',
      { x: 100, y: 50, width: 80, height: 60 },
      [0, 0],
    );
    expect(layout.rect.x).toBe(100);
    expect(layout.rect.y).toBe(50);
    expect(layout.rect.width).toBe(80);
    expect(layout.rect.height).toBe(60);
    expect(layout.textWidth).toBe(80);
    expect(layout.textHeight).toBe(60);
  });
});

describe('scope.id bbox happy path', () => {
  it('scope_id_bbox_basic：scope id="g" 内 3 node A/B/C → bbox 包 3 节点全局 4 角 AABB', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [80, 0], text: 'B' },
          { type: 'node', id: 'C', position: [40, 60], text: 'C' },
        ],
      },
      // 用 referent 取 bbox 中心比 path 端点（带 boundary clip 拉向 source）更稳定
      {
        type: 'node',
        id: 'orbit',
        position: { origin: 'g', angle: 0, radius: 200 },
        text: 'O',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 400] },
          { type: 'step', kind: 'line', to: 'orbit' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    // g bbox 中心 ≈ (40, 30)（A、B、C 4 角 AABB 的中心：x 范围含 A.west~B.east、y 范围含 A.north~C.south）；
    // orbit = (40 + 200, 30) = (240, 30)；end 经 boundary clip 后 x 接近 240
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 240)).toBeLessThan(30);
    expect(Math.abs(end![1] - 30)).toBeLessThan(30);
  });

  it('scope_id_north_anchor：path to="g.north" → bbox 顶边中点', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [80, 100], text: 'B' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [40, 200] },
          { type: 'step', kind: 'line', to: 'g.north' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // bbox.north = (40, top) — top 来自 A 的 north-most 边（y 较小一侧）
    expect(Math.abs(end![0] - 40)).toBeLessThan(20);
    expect(end![1]).toBeLessThan(50);
  });

  it('scope_id_east_anchor：path to="g.east" → bbox 右边中点', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [100, 50], text: 'B' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 25] },
          { type: 'step', kind: 'line', to: 'g.east' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // east 的 x 应大于 100（B 中心），y ≈ 25（垂直中点）
    expect(end![0]).toBeGreaterThan(100);
    expect(Math.abs(end![1] - 25)).toBeLessThan(20);
  });

  it('scope_id_numeric_anchor_30：path to="g.30" → bbox 30° boundaryPoint', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [60, 60], text: 'B' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 0] },
          { type: 'step', kind: 'line', to: 'g.30' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 30°（+x +y 局部）→ bbox 右下方向（screen y-down 下 +y 是下方）；x > 0、y > 0
    expect(end![0]).toBeGreaterThan(0);
    expect(end![1]).toBeGreaterThan(0);
  });

  it('scope_id_numeric_anchor_negative：path to="g.-45" → bbox -45° boundaryPoint', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [60, 60], text: 'B' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 0] },
          { type: 'step', kind: 'line', to: 'g.-45' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // -45°（+x -y 局部）→ 右上方向；x > 0、y < 0
    expect(end![0]).toBeGreaterThan(0);
    expect(end![1]).toBeLessThan(0);
  });

  it('scope_id_referent_polar：另一 node polar.origin=g 取 bbox 中心', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [60, 0], text: 'B' },
        ],
      },
      {
        type: 'node',
        id: 'orbit',
        position: { origin: 'g', angle: 0, radius: 100 },
        text: 'O',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'orbit' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'POLAR_ORIGIN_UNRESOLVED')).toHaveLength(0);
    // g bbox 中心 ≈ (30, 0)，orbit = (30, 0) + (100, 0) = (130, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 130)).toBeLessThan(20);
  });

  it('scope_id_referent_at：另一 node direction=right of=g distance=30 取 bbox 中心右 30', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [40, 0], text: 'B' },
        ],
      },
      {
        type: 'node',
        id: 'follower',
        position: { direction: 'right', of: 'g', distance: 80 },
        text: 'F',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'follower' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'AT_TARGET_UNRESOLVED')).toHaveLength(0);
    // g 中心 ≈ (20, 0)，follower = (20 + 80, 0) = (100, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 100)).toBeLessThan(20);
  });

  it('scope_id_referent_offset：另一 coordinate offset=g + (10,0) 取 bbox 中心 + 偏移', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [40, 0], text: 'B' },
        ],
      },
      {
        type: 'coordinate',
        id: 'anchor-pt',
        position: { of: 'g', offset: [10, 0] },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'anchor-pt' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toHaveLength(0);
    // g 中心 ≈ (20, 0)，anchor-pt = (30, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 30)).toBeLessThan(5);
  });

  it('scope_id_anchor_center：path to="g"（无 anchor 后缀）= bbox 中心点', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [40, 0], text: 'B' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // boundaryPoint clip → 端点贴 bbox 边界、不是中心；但 x 应接近中心 20
    expect(Math.abs(end![0] - 20)).toBeLessThan(40);
  });
});

describe('scope.id bbox 边界', () => {
  it('scope_id_empty_bbox_translate：空 scope id="g" + translate(50,50) → bbox 落 (50,50) 0×0', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        transforms: [{ kind: 'translate', x: 50, y: 50 }],
        children: [],
      },
      {
        type: 'node',
        id: 'rel',
        position: { of: 'g', offset: [10, 0] },
        text: 'R',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'rel' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toHaveLength(0);
    // g bbox 退化为 (50, 50) 0×0 → rel = (50+10, 50) = (60, 50)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 60)).toBeLessThan(20);
    expect(Math.abs(end![1] - 50)).toBeLessThan(20);
  });

  it('scope_id_empty_bbox_no_transform：空 scope id="g" 无 transform → bbox 落 (0,0) 0×0', () => {
    const ir = scene([
      { type: 'scope', id: 'g', children: [] },
      {
        type: 'node',
        id: 'rel',
        position: { of: 'g', offset: [25, 0] },
        text: 'R',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'rel' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'OFFSET_BASE_UNRESOLVED')).toHaveLength(0);
    // rel = (0 + 25, 0) = (25, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 25)).toBeLessThan(20);
  });

  it('scope_id_single_child_bbox：scope id="g" 内仅 1 个 node → bbox 等于该 node AABB', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [{ type: 'node', id: 'A', position: [80, 40], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // bbox 中心 ≈ A 的中心 (80, 40)；boundary clip 后 x 应接近 80
    expect(Math.abs(end![0] - 80)).toBeLessThan(20);
  });

  it('scope_id_includes_coordinate：scope 含 node + coordinate → bbox 同时包 coord 的 0×0 点', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'coordinate', id: 'far', position: [200, 0] },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [100, 200] },
          { type: 'step', kind: 'line', to: 'g.east' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // bbox 含 (200, 0) coordinate 点 → east 的 x 应接近 200
    expect(Math.abs(end![0] - 200)).toBeLessThan(20);
  });
});

describe('scope.id bbox 错误路径', () => {
  it('scope_id_collision_with_node：scope id="foo" + node id="foo" → DUPLICATE_NODE_ID warn（不抛错）', () => {
    const ir = scene([
      { type: 'node', id: 'foo', position: [0, 0], text: 'N' },
      {
        type: 'scope',
        id: 'foo',
        children: [{ type: 'node', id: 'inner', position: [10, 0], text: 'I' }],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it('scope_id_collision_with_scope_siblings：两个兄弟 scope 都用 id="g" → DUPLICATE_NODE_ID warn', () => {
    const ir = scene([
      { type: 'scope', id: 'g', children: [{ type: 'node', id: 'a', position: [0, 0], text: 'a' }] },
      { type: 'scope', id: 'g', children: [{ type: 'node', id: 'b', position: [50, 0], text: 'b' }] },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it('scope_id_collision_with_scope_nested：外 scope id="g" 嵌套内 scope id="g" → DUPLICATE_NODE_ID warn（外层默认无 localNamespace → 内 scope 在同 frame 注册同 id）', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'a', position: [0, 0], text: 'a' },
          {
            type: 'scope',
            id: 'g',
            children: [{ type: 'node', id: 'b', position: [50, 0], text: 'b' }],
          },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it('scope_id_collision_with_coordinate：scope id="A" + coordinate id="A" → DUPLICATE_NODE_ID warn', () => {
    const ir = scene([
      { type: 'scope', id: 'A', children: [{ type: 'node', id: 'inner', position: [0, 0], text: 'i' }] },
      { type: 'coordinate', id: 'A', position: [100, 0] },
    ]);
    const warnings: Array<CompileWarning> = [];
    expect(() => compileToScene(ir, { onWarn: w => warnings.push(w) })).not.toThrow();
    const dups = warnings.filter(w => w.code === 'DUPLICATE_NODE_ID');
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it('scope_id_forward_reference_rejected：node A polar.origin="g" 在 scope id="g" 之前 → 解析失败抛错', () => {
    const ir = scene([
      {
        type: 'node',
        id: 'A',
        position: { origin: 'g', angle: 0, radius: 10 },
        text: 'A',
      },
      {
        type: 'scope',
        id: 'g',
        children: [{ type: 'node', id: 'inner', position: [0, 0], text: 'i' }],
      },
    ]);
    expect(() => compileToScene(ir, { onWarn: () => {} })).toThrow();
  });

  it('scope_id_unknown_anchor_name：path to="g.invalid" → parseNodeRef 抛 unknown anchor 错（v0.1 行为延续）', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [{ type: 'node', id: 'a', position: [0, 0], text: 'a' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g.invalid' },
        ],
      },
    ]);
    expect(() => compileToScene(ir)).toThrow(/unknown anchor/);
  });
});

describe('scope.id bbox 交互', () => {
  it('scope_id_bbox_rotated_scope：scope id="g" rotate(45) + 4 node → bbox = 4 node 旋转后全局坐标 AABB', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        transforms: [{ kind: 'rotate', degrees: 45 }],
        children: [
          { type: 'node', id: 'A', position: [50, 0], text: 'A' },
          { type: 'node', id: 'B', position: [-50, 0], text: 'B' },
          { type: 'node', id: 'C', position: [0, 50], text: 'C' },
          { type: 'node', id: 'D', position: [0, -50], text: 'D' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [200, 200] },
          { type: 'step', kind: 'line', to: 'g' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    // 4 个 node 旋转 45 后中心仍在距原点 50 的位置；bbox 中心 ≈ (0, 0)；端点 boundary clip 后不应离 (0,0) 过远
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0])).toBeLessThan(200);
    expect(Math.abs(end![1])).toBeLessThan(200);
  });

  it('scope_id_nested_bbox_outer_includes_inner：outer scope id="outer" 含 inner scope id="inner" → outer bbox 包 inner 内全部 node', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'outer',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          {
            type: 'scope',
            id: 'inner',
            transforms: [{ kind: 'translate', x: 100, y: 0 }],
            children: [
              { type: 'node', id: 'B', position: [0, 0], text: 'B' },
              { type: 'node', id: 'C', position: [50, 0], text: 'C' },
            ],
          },
        ],
      },
      // 外层 path 引用 outer.east（应反映 inner C 在 (150, 0) 的全局位置）
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'outer.east' },
        ],
      },
      // 外层 path 引用 inner.east（应只反映 B、C，east x 接近 C 的 (150, 0) east 边）
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'inner.east' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    // outer.east 与 inner.east 都应有 x 接近 150（C 全局位置）
    const paths = compiled.primitives.filter(p => p.type === 'path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    for (const p of paths) {
      const e = lineTo(p);
      expect(e).toBeDefined();
      // 两条 path 的 east x 都应 >= 100（至少包含 inner B 全局位置 100；outer 还要包 A 在 0）
      expect(e![0]).toBeGreaterThanOrEqual(100);
    }
  });

  it('scope_id_as_at_target_with_nodeDistance：另一 node direction=right of=g + CompileOption.nodeDistance=20', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [40, 0], text: 'B' },
        ],
      },
      {
        type: 'node',
        id: 'follower',
        position: { direction: 'right', of: 'g' },
        text: 'F',
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'follower' },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, {
      nodeDistance: 200,
      onWarn: w => warnings.push(w),
    });
    expect(warnings.filter(w => w.code === 'AT_TARGET_UNRESOLVED')).toHaveLength(0);
    // g 中心 ≈ (20, 0)，distance 200 → follower 中心 (220, 0)
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    expect(Math.abs(end![0] - 220)).toBeLessThan(20);
  });

  it('scope_id_in_polar_translate_scope：scope id="g" polar-translate(angle:0, radius:50) → bbox 含投到全局的 node', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        transforms: [{ kind: 'polar-translate', angle: 0, radius: 50 }],
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g' },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // polar-translate angle 0 radius 50 → translate(50, 0)；A 全局 (50, 0)；g bbox 中心 ≈ A 中心
    expect(Math.abs(end![0] - 50)).toBeLessThan(20);
  });

  it('scope_id_bbox_with_inner_rotate_node：scope id="g" 内 node 自身 rotate 30 → 4 旋转角点参与 AABB', () => {
    // 用固定尺寸 measurer 让 A 有可观尺寸（30×20），rotate 30 后 4 角点 AABB 应可量化比较
    const measureText: TextMeasurer = () => ({ width: 30, height: 20 });
    const irBase = scene([
      {
        type: 'scope',
        id: 'g',
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g.east' },
        ],
      },
    ]);
    const irRot = scene([
      {
        type: 'scope',
        id: 'g',
        children: [{ type: 'node', id: 'A', position: [0, 0], rotate: 30, text: 'A' }],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 200] },
          { type: 'step', kind: 'line', to: 'g.east' },
        ],
      },
    ]);
    const eBase = lineTo(topPath(compileToScene(irBase, { measureText }).primitives));
    const eRot = lineTo(topPath(compileToScene(irRot, { measureText }).primitives));
    expect(eBase).toBeDefined();
    expect(eRot).toBeDefined();
    // 旋转 30 后 A 的 4 角点投到全局后 AABB 应比未旋转更大（rotate 让 4 角点偏离主轴）
    // 量化断言：rotate 版本 east x 应显著大于 base 版本（同一中心、旋转后的 AABB 半宽 > 原矩形半宽）
    expect(eRot![0]).toBeGreaterThan(eBase![0] + 1);
  });

  it('scope_id_self_reference_in_inner_path：scope 内 path 端点用本 scope.id 取真 bbox（不是 placeholder 0×0 中心）', () => {
    // 回归测试：bug 修复前，scope 内 path 引用本 scope.id 时 lookup 命中 placeholder（0×0 落在 chain 原点），
    // 端点 ≈ 原点；修复后端点应取真 bbox（A、B 横跨 [0, 100] → east x 应 ≥ 100）
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [100, 0], text: 'B' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 200] },
              { type: 'step', kind: 'line', to: 'g.east' },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 真 bbox.east x ≥ B 中心 100；placeholder 0×0 east x ≈ 0；断 > 80 足以区分两种实现
    expect(end![0]).toBeGreaterThan(80);
  });
});
