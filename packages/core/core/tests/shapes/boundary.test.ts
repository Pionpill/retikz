import { describe, expect, it } from 'vitest';
import { Boundary, BoundarySchema } from '../../src/ir/boundary';
import * as core from '../../src/index';
import { NodeSchema } from '../../src/ir/node';
import { NodeTargetSchema } from '../../src/ir/path/target';
import { anchorOf, angleBoundaryOf, boundaryPointOf, layoutNode } from '../../src/compile/node';
import { NameStack } from '../../src/compile/name-stack';
import { BUILTIN_SHAPES, star } from '../../src/shapes';
import type { Rect } from '../../src/shapes';
import { compileToScene } from '../../src/compile/compile';
import type { IR, IRNodeTarget } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

describe('BoundarySchema', () => {
  it('parses reserved keywords and registered names', () => {
    expect(BoundarySchema.parse('shape')).toBe('shape');
    expect(BoundarySchema.parse('circle')).toBe('circle');
    expect(BoundarySchema.parse('rectangle')).toBe('rectangle');
  });
  it('parses nested {type, params}', () => {
    expect(BoundarySchema.parse({ type: 'star', params: { points: 5 } })).toEqual({
      type: 'star',
      params: { points: 5 },
    });
  });
  it('rejects empty string', () => {
    expect(() => BoundarySchema.parse('')).toThrow();
  });
  it('exposes reserved-keyword constant', () => {
    expect(Boundary.Self).toBe('shape');
    expect(Boundary.Circle).toBe('circle');
  });
});

describe('boundary IR fields', () => {
  it('NodeSchema accepts boundary', () => {
    const n = NodeSchema.parse({ type: 'node', id: 'a', shape: 'rectangle', position: [0, 0], boundary: 'circle' });
    expect(n.boundary).toBe('circle');
  });
  it('NodeSchema boundary optional', () => {
    const n = NodeSchema.parse({ type: 'node', id: 'a', position: [0, 0] });
    expect(n.boundary).toBeUndefined();
  });
  it('NodeTargetSchema accepts boundary', () => {
    const t = NodeTargetSchema.parse({ id: 'a', boundary: 'shape' });
    expect(t.boundary).toBe('shape');
  });
});

const measureText = (): { width: number; height: number; ascent: number } => ({
  width: 0,
  height: 0,
  ascent: 0,
});

describe('boundary-aware boundary/compass', () => {
  it("boundaryPointOf 'rectangle' boundary hits AABB edge, 'shape' hits star outline", () => {
    const nameStack = new NameStack();
    const starLayout = layoutNode(
      {
        type: 'node',
        id: 'star1',
        shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
        position: [0, 0],
      },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    // 对角线方向：星形轮廓凹入（凹角内径），AABB 矩形则在外接框边缘——两者一定不同
    const toward: [number, number] = [100, 100];
    const onShape = boundaryPointOf(starLayout, toward, 'shape');
    const onRect = boundaryPointOf(starLayout, toward, 'rectangle');
    // 真实星形边界（凹入的凹角侧） ≠ AABB 矩形右上角边界
    expect(onShape).not.toEqual(onRect);
  });

  it("boundaryPointOf 缺省参数等价于 'shape'", () => {
    const nameStack = new NameStack();
    const layout = layoutNode(
      {
        type: 'node',
        id: 'rect1',
        shape: 'rectangle',
        position: [0, 0],
      },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    const toward: [number, number] = [100, 0];
    // 缺省与显式 'shape' 结果相同
    expect(boundaryPointOf(layout, toward)).toEqual(boundaryPointOf(layout, toward, 'shape'));
  });

  it('sector compass north via AABB (不再 throw)', () => {
    const nameStack = new NameStack();
    const sectorLayout = layoutNode(
      {
        type: 'node',
        id: 'sec1',
        shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } },
        position: [0, 0],
      },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    // 改前：sector.anchor 不认识 compass 名，抛 Unknown anchor
    // 改后：compass 名上提为 AABB，不再 throw，返回 AABB 上的点
    expect(() => anchorOf(sectorLayout, 'north', 'shape')).not.toThrow();
    const point = anchorOf(sectorLayout, 'north', 'shape');
    // north 点的 y 坐标应在 rect 上边（y <= rect.y，即 north = y - halfHeight）
    expect(point).toBeDefined();
    expect(Array.isArray(point)).toBe(true);
  });

  it("anchorOf sector 专属 anchor 'apex' 仍返回形状自身值，不受 boundary 影响", () => {
    const nameStack = new NameStack();
    const sectorLayout = layoutNode(
      {
        type: 'node',
        id: 'sec2',
        shape: { type: 'sector', params: { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90 } },
        position: [0, 0],
      },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    // apex 是 sector 专属命名 anchor，不是 rect 方位名，始终走视觉形状
    expect(() => anchorOf(sectorLayout, 'apex')).not.toThrow();
    expect(() => anchorOf(sectorLayout, 'apex', 'shape')).not.toThrow();
    expect(() => anchorOf(sectorLayout, 'apex', 'rectangle')).not.toThrow();
    // 不同 boundary 对专属 anchor 结果相同（恒走视觉形状）
    expect(anchorOf(sectorLayout, 'apex', 'shape')).toEqual(anchorOf(sectorLayout, 'apex', 'rectangle'));
  });

  it('angleBoundaryOf 缺省与显式 shape 等价', () => {
    const nameStack = new NameStack();
    const layout = layoutNode(
      {
        type: 'node',
        id: 'r1',
        shape: 'rectangle',
        position: [0, 0],
      },
      measureText,
      nameStack,
      undefined,
      [],
      undefined,
      BUILTIN_SHAPES,
    );
    expect(angleBoundaryOf(layout, 0)).toEqual(angleBoundaryOf(layout, 0, 'shape'));
    expect(angleBoundaryOf(layout, 90)).toEqual(angleBoundaryOf(layout, 90, 'shape'));
  });
});

describe('star.anchor no longer handles compass directly', () => {
  it('returns undefined for compass names (compile layer owns them now)', () => {
    const rect: Rect = { x: 0, y: 0, width: 60, height: 60, rotate: 0 };
    const params = { points: 5, innerRadius: 10, outerRadius: 30 };
    expect(star.anchor(rect, 'north', params)).toBeUndefined();
    expect(star.anchor(rect, 'tip-0', params)).toBeDefined();
  });
});

// ─── 端到端集成：path clip 透传 boundary ?? node.boundary ───────────────────────

/**
 * 找"连接线"那条 PathPrim（IRPath step 编译产物）：区分于节点 emit 的形状路径。
 * star 的 emit 产含 close 命令的多边形；连接线只有 move + line，无 close。
 * 以"无 close 命令"作为区分依据。
 */
const findConnectionPath = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.filter((x): x is PathPrim => x.type === 'path').find(p => !p.commands.some(c => c.kind === 'close'));

/**
 * 构造 IR（star 节点 + path），编译后取连接线在 star 那端的实际端点。
 * @param nodeBoundary star 节点的 boundary（undefined = 无）
 * @param targetOverride 追加到 { id: 'star' } 的额外字段（如 boundary）
 * @param start path 的 move 起点（决定 toward 方向）
 */
const lineEndpointWithNode = (
  nodeBoundary: string | undefined,
  targetOverride: Partial<IRNodeTarget>,
  start: [number, number] = [200, 0],
): [number, number] => {
  const target: IRNodeTarget = { id: 'star', ...targetOverride };
  const nodeIr: IR['children'][number] = nodeBoundary
    ? {
        type: 'node',
        id: 'star',
        shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
        position: [0, 0],
        boundary: nodeBoundary,
      }
    : {
        type: 'node',
        id: 'star',
        shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
        position: [0, 0],
      };
  const ir: IR = {
    version: 1,
    type: 'scene',
    children: [
      nodeIr,
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: start },
          { type: 'step', kind: 'line', to: target },
        ],
      },
    ],
  };
  const compiled = compileToScene(ir);
  // star emit 产含 close 的多边形 PathPrim；连接线无 close，以此区分
  const prim = findConnectionPath(compiled.primitives);
  if (!prim) throw new Error('expected connection PathPrim');
  for (const cmd of prim.commands) {
    if (cmd.kind === 'line') return [cmd.to[0], cmd.to[1]];
  }
  throw new Error('no line command found');
};

describe('端到端：path clip 透传 boundary ?? node.boundary', () => {
  // 方向选取：[200, 0] → star 中心 [0, 0]，即 toward = [0,0]（path 从 [200,0] 连到 star）
  // star 有 5 个尖角，0° 是第一个尖角（outerRadius=30）；
  // 改从 [0,0] 方向出发，让 toward 从 star 中心看去往 [200,0]（即 east 方向 0°）——
  // star 在 0° 方向是尖角（outerRadius=30）；circle 也是半径30（max(30,30)=30）→ 数值相同！
  //
  // 默认 −90 基准下：tip-k 角 = −90 + k·72（即 270/342/54/126/198°），notch-k 角 = −54 + k·72
  //   （即 306/18/90/162/234°）。选 18° 方向（notch-1）取凹角边界。
  //
  // 让 boundaryPoint 取 18° 方向：path 从 star 中心朝 [100, 100·tan18°≈32.49] 出发，
  //   toward 方向 = arctan(32.49/100) ≈ 18°，正好命中 notch-1（凹角），
  //   star 边界 ≈ innerRadius=10，circle 边界 = 30，差异显著（20 单位）。

  it('(a) node 无 boundary → 端点贴真实星形边界（凹角方向，约 innerRadius=10）', () => {
    // start=[100, 32.49]: toward≈18°，star 凹角（notch-1），边界约 r=10
    const pointA = lineEndpointWithNode(undefined, {}, [100, 100 * Math.tan((18 * Math.PI) / 180)]);
    // 星形边界点离中心 [0,0] 的距离应约等于 10（innerRadius）
    const distA = Math.sqrt(pointA[0] ** 2 + pointA[1] ** 2);
    expect(distA).toBeCloseTo(10, 0);
  });

  it('(b) node boundary="circle" → 端点贴真圆边界（半径=30=outerRadius）', () => {
    // circle 连接面：r = max(halfWidth, halfHeight) = max(30, 30) = 30
    const pointB = lineEndpointWithNode('circle', {});
    const distB = Math.sqrt(pointB[0] ** 2 + pointB[1] ** 2);
    expect(distB).toBeCloseTo(30, 0);
  });

  it('(a) != (b)：star 形边界与圆形边界不同（凹角方向显著差异）', () => {
    const notchStart: [number, number] = [100, 100 * Math.tan((18 * Math.PI) / 180)];
    const pointA = lineEndpointWithNode(undefined, {}, notchStart);
    const pointB = lineEndpointWithNode('circle', {}, notchStart);
    // innerRadius=10 vs circle r=30，差距 20，必然不等
    expect(pointA).not.toEqual(pointB);
  });

  it('(c) node boundary="circle" 且 端点 boundary="shape" → 又贴真实星形边界，≈ (a)', () => {
    // 端点 boundary:'shape' 覆盖 node boundary:'circle'，回退到视觉形状（star 凹角 ≈ 10）
    const notchStart: [number, number] = [100, 100 * Math.tan((18 * Math.PI) / 180)];
    const pointC = lineEndpointWithNode('circle', { boundary: 'shape' }, notchStart);
    const pointA = lineEndpointWithNode(undefined, {}, notchStart);
    expect(pointC[0]).toBeCloseTo(pointA[0], 4);
    expect(pointC[1]).toBeCloseTo(pointA[1], 4);
  });
});

// ─── 导出断言 + 补充象限 ──────────────────────────────────────────────────────

describe('public export + remaining quadrants', () => {
  it('Boundary / BoundarySchema exported from package root', () => {
    expect(core.Boundary.Self).toBe('shape');
    expect(core.Boundary.Circle).toBe('circle');
    expect(core.BoundarySchema).toBeDefined();
    // BoundaryKeyword / IRBoundary 是类型，仅编译时可见，此处不再 runtime 断言
  });

  it('boundary_unregistered_throws: boundary 指向未注册 shape 且有 path 连到该节点时编译抛错', () => {
    // resolveBoundary 在 clipForTarget → boundaryPointOf 里被调用（有 path 才触发）
    const ir: core.IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'n',
          shape: 'rectangle',
          position: [0, 0],
          // 'nope' 既非保留字（shape/circle/rectangle/ellipse），又非内置 registry shape
          boundary: 'nope',
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 0] },
            { type: 'step', kind: 'line', to: { id: 'n' } },
          ],
        },
      ],
    };
    expect(() => core.compileToScene(ir)).toThrow(/Unknown connection surface 'nope'/);
  });

  it('specific_anchor_ignores_boundary: tip-0 是星形专属 anchor，boundary 不影响其解析结果', () => {
    // 两个 IR：boundary='shape'（默认）和 boundary='circle'，anchor='tip-0' 均指向同一尖角
    const makeIr = (boundary: string): core.IR => ({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'star',
          shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
          position: [0, 0],
          boundary,
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 0] },
            { type: 'step', kind: 'line', to: { id: 'star', anchor: 'tip-0' } },
          ],
        },
      ],
    });
    const sceneShape = core.compileToScene(makeIr('shape'));
    const sceneCircle = core.compileToScene(makeIr('circle'));
    // 取连接线的 line 端点（无 close 的路径）
    const endpointOf = (prims: ReadonlyArray<core.ScenePrimitive>): [number, number] => {
      const path = prims.filter((p): p is core.PathPrim => p.type === 'path').find(p => !p.commands.some(c => c.kind === 'close'));
      if (!path) throw new Error('no connection path');
      for (const cmd of path.commands) {
        if (cmd.kind === 'line') return [cmd.to[0], cmd.to[1]];
      }
      throw new Error('no line command');
    };
    const epShape = endpointOf(sceneShape.primitives);
    const epCircle = endpointOf(sceneCircle.primitives);
    // tip-0 是专属命名 anchor，boundary 改变不影响结果
    expect(epShape[0]).toBeCloseTo(epCircle[0], 4);
    expect(epShape[1]).toBeCloseTo(epCircle[1], 4);
  });

  it('layout_neutral: boundary 改变不影响 scene.layout（节点布局边界）', () => {
    const makeIr = (boundary: string | undefined): core.IR => ({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'star',
          shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
          position: [0, 0],
          ...(boundary !== undefined ? { boundary } : {}),
        },
      ],
    });
    const layoutDefault = core.compileToScene(makeIr(undefined)).layout;
    const layoutShape = core.compileToScene(makeIr('shape')).layout;
    const layoutCircle = core.compileToScene(makeIr('circle')).layout;
    // layout 由视觉 shape 决定，boundary 只影响连接面路由，与 layout 无关
    expect(layoutShape).toEqual(layoutDefault);
    expect(layoutCircle).toEqual(layoutDefault);
  });

  it('roundtrip_self_describing: 含 node.boundary / 端点 boundary 的 IR JSON 序列化后再 schema parse 等价', () => {
    const ir: core.IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'star',
          shape: { type: 'star', params: { points: 5, innerRadius: 10, outerRadius: 30 } },
          position: [0, 0],
          boundary: 'circle',
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [100, 0] },
            { type: 'step', kind: 'line', to: { id: 'star', boundary: 'shape' } },
          ],
        },
      ],
    };
    const roundtripped = core.SceneSchema.parse(JSON.parse(JSON.stringify(ir)));
    // 节点 boundary 字段正确保留
    const node = roundtripped.children.find(c => c.type === 'node') as core.IRNode;
    expect(node.boundary).toBe('circle');
    // path 端点 boundary 字段正确保留
    const path = roundtripped.children.find(c => c.type === 'path') as core.IRPath;
    const lineStep = path.children.find(s => s.kind === 'line');
    expect(lineStep).toBeDefined();
    const to = lineStep!.to as core.IRNodeTarget;
    expect(to.boundary).toBe('shape');
  });

  it('boundary_noop_in_between: between 端点带 boundary 编译不报错，正常产出路径', () => {
    // between 端点被 clipForTarget 处理为固定中点（refPointOfTarget），boundary 字段被忽略不引发 throw
    const ir: core.IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 50] },
            {
              type: 'step',
              kind: 'line',
              to: {
                between: [
                  // between 的子端点是 NodeTarget，带 boundary 字段（boundary 在 between 路径不触发 resolveBoundary）
                  { id: 'A', boundary: 'circle' },
                  { id: 'B' },
                ],
                t: 0.5,
              },
            },
          ],
        },
      ],
    };
    expect(() => core.compileToScene(ir)).not.toThrow();
    const scene = core.compileToScene(ir);
    // 产出包含路径
    const paths = scene.primitives.filter(p => p.type === 'path');
    expect(paths.length).toBeGreaterThan(0);
  });
});
