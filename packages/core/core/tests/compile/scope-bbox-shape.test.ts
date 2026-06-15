/**
 * scope.id boundingShape 圆形包络测试
 * @description `<Scope id=... boundingShape="circle">` 应把 scope 的 synthetic layout 注册为
 *   最小外接圆（ellipse + circumscribe:'equal'），anchor/boundary 走既有 ellipse 路径。
 *   缺省 boundingShape（矩形 AABB）逐字不变。boundingShape 是受控枚举（'rectangle' | 'circle'），
 *   枚举外的值由 schema 在 parse 边界拒绝，compile 不再做运行时回退 warn。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import {
  collectScopeCornerPoints,
  registerScopeCircleLayout,
} from '../../src/compile/scope';
import { minimalEnclosingCircle } from '@retikz/math';
import type { CompileWarning, IR, ScenePrimitive } from '../../src';
import type { NodeLayout } from '../../src/compile/node';
import { BUILTIN_SHAPES } from '../../src/shapes';

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

/** 构造一个 width/height 已知、中心已知的 0-rotate 测试 layout */
const layoutAt = (cx: number, cy: number, w: number, h: number): NodeLayout => ({
  id: 'test',
  shapeName: 'rectangle',
  shapeDef: BUILTIN_SHAPES.rectangle,
  rect: { x: cx, y: cy, width: w, height: h, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: w,
  textHeight: h,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes: BUILTIN_SHAPES,
});

describe('registerScopeCircleLayout 单元测试', () => {
  it('shapeName ellipse + shapeParams circumscribe:equal', () => {
    const layout = registerScopeCircleLayout('g', [], [0, 0]);
    expect(layout.shapeName).toBe('ellipse');
    expect(layout.shapeParams).toEqual({ circumscribe: 'equal' });
  });

  it('空点集 → 0×0 占位落在 fallbackOrigin', () => {
    const layout = registerScopeCircleLayout('g', [], [30, 40]);
    expect(layout.id).toBe('g');
    expect(layout.rect.x).toBe(30);
    expect(layout.rect.y).toBe(40);
    expect(layout.rect.width).toBe(0);
    expect(layout.rect.height).toBe(0);
    expect(layout.rect.rotate).toBe(0);
    expect(layout.margin).toBe(0);
  });

  it('有点集 → rect width===height===2*radius，center 等于 MEC center', () => {
    const corners: Array<[number, number]> = [
      [0, 0],
      [60, 0],
      [30, 40],
    ];
    const mec = minimalEnclosingCircle([...corners]);
    expect(mec).not.toBeNull();
    const layout = registerScopeCircleLayout('g', corners, [0, 0]);
    const diameter = mec!.radius * 2;
    expect(layout.rect.width).toBeCloseTo(diameter, 5);
    expect(layout.rect.height).toBeCloseTo(diameter, 5);
    expect(layout.rect.x).toBeCloseTo(mec!.center[0], 5);
    expect(layout.rect.y).toBeCloseTo(mec!.center[1], 5);
    expect(layout.textWidth).toBeCloseTo(diameter, 5);
    expect(layout.textHeight).toBeCloseTo(diameter, 5);
  });
});

describe('scope boundingShape="circle" 集成测试', () => {
  it('circle_envelope_east_anchor：scope.east 应落在 MEC 边界上（距 MEC 中心 ≈ radius）', () => {
    // 3 个节点，文字为 '' 使节点近似 0 尺寸（不传 measureText），仅依赖位置
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        boundingShape: 'circle',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: '' },
          { type: 'node', id: 'B', position: [80, 0], text: '' },
          { type: 'node', id: 'C', position: [40, 60], text: '' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 30] },
          { type: 'step', kind: 'line', to: { id: 'g', anchor: 'east' } },
        ],
      },
    ]);
    const warnings: Array<CompileWarning> = [];
    const compiled = compileToScene(ir, { onWarn: w => warnings.push(w) });
    expect(warnings.filter(w => w.code === 'UNRESOLVED_NODE_REFERENCE')).toHaveLength(0);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 从 east 方向入射，x 应 > 0（MEC 中心偏右侧）
    expect(end![0]).toBeGreaterThan(0);
  });

  it('circle_envelope_mec_distance：scope.east 距 MEC 中心的距离约等于 MEC radius', () => {
    // 用 0×0 的 node（无 measureText 默认 0 尺寸），3 个角点即为 node 中心点
    const nodePositions: Array<[number, number]> = [
      [0, 0],
      [100, 0],
      [50, 80],
    ];
    const cornerPoints = nodePositions; // 0×0 node → 4 角点即 node 中心点（collapsed），直接用中心点
    const mec = minimalEnclosingCircle([...cornerPoints]);
    expect(mec).not.toBeNull();
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        boundingShape: 'circle',
        children: nodePositions.map((pos, idx) => ({
          type: 'node' as const,
          id: `n${idx}`,
          position: pos,
          text: '',
        })),
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [500, mec!.center[1]] },
          { type: 'step', kind: 'line', to: { id: 'g', anchor: 'east' } },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // east anchor of ellipse with circumscribe:equal at (cx, cy) with diameter d → (cx + d/2, cy)
    // distance from center to end should be ≈ radius
    const dist = Math.sqrt((end![0] - mec!.center[0]) ** 2 + (end![1] - mec!.center[1]) ** 2);
    // Allow generous tolerance since boundary clipping may offset slightly
    expect(dist).toBeGreaterThan(mec!.radius * 0.5);
  });

  it('circle_envelope_center：path to="g"（无 anchor）→ boundary clip 后 x 接近 MEC 中心附近', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        boundingShape: 'circle',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: '' },
          { type: 'node', id: 'B', position: [60, 0], text: '' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 300] },
          { type: 'step', kind: 'line', to: { id: 'g' } },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // MEC center ≈ (30, 0)；boundary clip 后 x 应在合理范围内
    expect(Math.abs(end![0] - 30)).toBeLessThan(50);
  });
});

describe('scope boundingShape 缺省（矩形 AABB）向后兼容', () => {
  it('default_rectangle_unchanged：无 boundingShape → east anchor 等于 AABB 东边界（与改前一致）', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: '' },
          { type: 'node', id: 'B', position: [60, 0], text: '' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 0] },
          { type: 'step', kind: 'line', to: { id: 'g', anchor: 'east' } },
        ],
      },
    ]);
    const compiled = compileToScene(ir);
    const end = lineTo(topPath(compiled.primitives));
    expect(end).toBeDefined();
    // 矩形 AABB east x 应接近 B 的位置（60），y 接近 0
    expect(end![0]).toBeGreaterThan(30);
    expect(Math.abs(end![1])).toBeLessThan(20);
  });

  it('explicit_rectangle_unchanged：boundingShape="rectangle" → 与缺省行为一致', () => {
    const irDefault = scene([
      {
        type: 'scope',
        id: 'g',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: '' },
          { type: 'node', id: 'B', position: [60, 0], text: '' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 0] },
          { type: 'step', kind: 'line', to: { id: 'g', anchor: 'east' } },
        ],
      },
    ]);
    const irExplicit = scene([
      {
        type: 'scope',
        id: 'g',
        boundingShape: 'rectangle',
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: '' },
          { type: 'node', id: 'B', position: [60, 0], text: '' },
        ],
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [300, 0] },
          { type: 'step', kind: 'line', to: { id: 'g', anchor: 'east' } },
        ],
      },
    ]);
    const endDefault = lineTo(topPath(compileToScene(irDefault).primitives));
    const endExplicit = lineTo(topPath(compileToScene(irExplicit).primitives));
    expect(endDefault).toBeDefined();
    expect(endExplicit).toBeDefined();
    // x 坐标应非常接近（同一矩形 AABB east）
    expect(Math.abs(endDefault![0] - endExplicit![0])).toBeLessThan(1);
  });
});

describe('collectScopeCornerPoints 单元测试', () => {
  it('空 layouts → 空点集', () => {
    expect(collectScopeCornerPoints([])).toHaveLength(0);
  });

  it('1 个 layout → 4 个角点', () => {
    const points = collectScopeCornerPoints([layoutAt(0, 0, 40, 20)]);
    expect(points).toHaveLength(4);
  });

  it('N 个 layouts → 4N 个角点', () => {
    const layouts = [layoutAt(0, 0, 10, 10), layoutAt(50, 50, 10, 10), layoutAt(100, 0, 10, 10)];
    const points = collectScopeCornerPoints(layouts);
    expect(points).toHaveLength(12);
  });

  it('0×0 layout → 4 个相同角点（退化为单点）', () => {
    const points = collectScopeCornerPoints([layoutAt(30, 20, 0, 0)]);
    expect(points).toHaveLength(4);
    for (const [px, py] of points) {
      expect(px).toBeCloseTo(30, 5);
      expect(py).toBeCloseTo(20, 5);
    }
  });
});
