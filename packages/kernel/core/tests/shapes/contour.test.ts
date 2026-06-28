/**
 * ADR-03 contour shape —— 任意闭合顶点环作可连接 Node 形状
 * @description 覆盖测试象限（ADR § 实现契约 测试象限）：
 *   - Happy：矩形轮廓 / 旗帜形轮廓 emit、cornerRadius fillet、未居中点集自动居中等价；
 *   - 边界：恰好 3 顶点、cornerRadius 远大于边长逐角夹紧；
 *   - 错误：points<3 / 非有限顶点 schema 拒绝、params 偷渡函数编译期拦；
 *   - 交互：Node rotate / 各向异性 scale / boundaryPoint 连接 / compass anchor 回退 AABB；
 *   - JSON round-trip：{type:'contour', params} 经 NodeSchema 序列化往返等价。
 */
import { describe, expect, it } from 'vitest';

import type { ScenePrimitive } from '../../src/primitive';
import type { IR } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { contour } from '../../src/contract/shape';
import { NodeSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const compileNode = (n: Record<string, unknown>): ReturnType<typeof compileToScene> =>
  compileToScene(scene([{ type: 'node', position: [0, 0], ...n }]));

/** 收集 path commands 的 kind 序列 */
const kindsOf = (path: Extract<ScenePrimitive, { type: 'path' }>): Array<string> => path.commands.map(c => c.kind);

// ════════════════ Happy path ════════════════

describe('contour — Happy path', () => {
  it('contour-renders-quad：居中矩形顶点环 → move+3line+close 的 PathPrim', () => {
    const points = [
      [-5, -3],
      [5, -3],
      [5, 3],
      [-5, 3],
    ];
    const compiled = compileNode({ shape: { type: 'contour', params: { points } } });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    // 居中点集 + position[0,0] → 世界坐标即点本身；命令结构 move,line,line,line,close
    expect(kindsOf(path!)).toEqual(['move', 'line', 'line', 'line', 'close']);
  });

  it('contour-renders-flag：含一条斜边的非矩形 4 顶点 → 顺序正确且闭合', () => {
    const points = [
      [-24, 40],
      [24, 28],
      [24, -40],
      [-24, -40],
    ];
    const compiled = compileNode({ shape: { type: 'contour', params: { points } } });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const kinds = kindsOf(path!);
    expect(kinds[0]).toBe('move');
    expect(kinds[kinds.length - 1]).toBe('close');
    expect(kinds.filter(k => k === 'line').length).toBe(3); // 4 顶点 → move + 3 line + close
  });

  it('contour-fillet：cornerRadius>0 → 每个顶点插入 fillet 弧', () => {
    const points = [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ];
    const compiled = compileNode({ shape: { type: 'contour', params: { points, cornerRadius: 3 } } });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const kinds = kindsOf(path!);
    expect(kinds[0]).toBe('move');
    expect(kinds[kinds.length - 1]).toBe('close');
    // 与 polygon fillet 同引擎：每个顶点一段弧 + 每条边一段缩短直线
    expect(kinds.filter(k => k === 'arc').length).toBe(4);
    expect(kinds.filter(k => k === 'line').length).toBe(4);
  });

  it('contour-offcenter-autocentered：未居中点集（整体 +100）emit 与等价居中点集逐字一致', () => {
    const centered = [
      [-5, -3],
      [5, -3],
      [5, 3],
      [-5, 3],
    ];
    const offcenter = centered.map(([x, y]) => [x + 100, y + 100]);
    const baseline = compileNode({ shape: { type: 'contour', params: { points: centered } } });
    const shifted = compileNode({ shape: { type: 'contour', params: { points: offcenter } } });
    const basePath = findByType(baseline.primitives, 'path');
    const shiftPath = findByType(shifted.primitives, 'path');
    expect(basePath).toBeDefined();
    expect(shiftPath).toBeDefined();
    // core 按 AABB 中心自动居中 → Node position = 几何中心，emit 命令应 deep-equal（参考对照，不手算坐标）
    expect(shiftPath!.commands).toEqual(basePath!.commands);
  });
});

// ════════════════ 边界 ════════════════

describe('contour — 边界', () => {
  it('contour-min-three：恰好 3 顶点（三角）→ 正常出形', () => {
    const points = [
      [0, -10],
      [10, 8],
      [-10, 8],
    ];
    const compiled = compileNode({ shape: { type: 'contour', params: { points } } });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(kindsOf(path!)).toEqual(['move', 'line', 'line', 'close']);
  });

  it('contour-corner-clamp：cornerRadius 远大于边长 → 逐角夹紧、不自交、不抛错', () => {
    const points = [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ];
    expect(() => compileNode({ shape: { type: 'contour', params: { points, cornerRadius: 10000 } } })).not.toThrow();
    const compiled = compileNode({ shape: { type: 'contour', params: { points, cornerRadius: 10000 } } });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(kindsOf(path!).filter(k => k === 'arc').length).toBeGreaterThan(0);
  });
});

// ════════════════ 错误路径 ════════════════

describe('contour — 错误路径', () => {
  it('contour-reject-too-few：points.length<3 → paramsSchema 拒绝', () => {
    expect(
      contour.paramsSchema.safeParse({
        points: [
          [0, 0],
          [1, 1],
        ],
      }).success,
    ).toBe(false);
  });

  it('contour-reject-non-finite：NaN/Infinity 顶点 → paramsSchema 拒绝', () => {
    expect(
      contour.paramsSchema.safeParse({
        points: [
          [0, 0],
          [1, 1],
          [NaN, 2],
        ],
      }).success,
    ).toBe(false);
    expect(
      contour.paramsSchema.safeParse({
        points: [
          [0, 0],
          [1, 1],
          [Infinity, 2],
        ],
      }).success,
    ).toBe(false);
  });

  it('contour-reject-function-param：params 偷渡函数 → 编译期第一道 JSON-safe 护栏拦', () => {
    const points = [
      [-5, -5],
      [5, -5],
      [0, 5],
    ];
    let threw = false;
    try {
      compileNode({
        shape: {
          type: 'contour',
          params: { points, evil: () => 1 } as Record<string, unknown>,
        },
      });
    } catch {
      threw = true;
    }
    // JsonObjectSchema.parse(raw params) 跑在原始入参上、先于 paramsSchema → 函数被拦
    expect(threw).toBe(true);
  });
});

// ════════════════ 交互 ════════════════

describe('contour — 交互', () => {
  const points = [
    [-20, -10],
    [20, -10],
    [20, 10],
    [-20, 10],
  ];

  it('contour-rotate：Node rotate × contour → 编译出带 transform 的结构', () => {
    const compiled = compileNode({ rotate: 30, shape: { type: 'contour', params: { points } } });
    // 旋转由外层 GroupPrim 施加 → flatten 后应存在 group，且 path 仍 emit
    const flat = flattenPrims(compiled.primitives);
    const group = flat.find(p => p.type === 'group');
    const path = findByType(compiled.primitives, 'path');
    expect(group).toBeDefined();
    expect(path).toBeDefined();
  });

  it('contour-scale-corner：各向异性 scale（sx≠sy）→ points 按轴缩、cornerRadius 按几何均值缩', () => {
    // 用 scaleParams 直接验证语义（emit 几何亦应一致）：points 各轴缩、cornerRadius × sqrt(sx·sy)
    const scaled = contour.scaleParams!({ points, cornerRadius: 4 }, 4, 1) as {
      points: Array<[number, number]>;
      cornerRadius: number;
    };
    expect(scaled.points).toEqual(points.map(([x, y]) => [x * 4, y * 1]));
    expect(scaled.cornerRadius).toBeCloseTo(4 * Math.sqrt(4 * 1), 9);
  });

  it('contour-connect-boundary：另一 Path line to contour Node → 端点经 boundaryPoint 落轮廓边界', () => {
    const compiled = compileToScene(
      scene([
        { type: 'node', id: 'c', position: [0, 0], shape: { type: 'contour', params: { points } } },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [200, 0] },
            { type: 'step', kind: 'line', to: { id: 'c' } },
          ],
        },
      ] as IR['children']),
    );
    // 连接 line（无 close 的 path）；端点应在轮廓边界（朝 +x 边 x≈20），不是 AABB 角
    const linePath = flattenPrims(compiled.primitives).find(
      (p): p is Extract<ScenePrimitive, { type: 'path' }> =>
        p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
    );
    expect(linePath).toBeDefined();
    const end = linePath!.commands.find(c => c.kind === 'line') as { to: [number, number] };
    expect(end.to[0]).toBeCloseTo(20, 3);
    expect(end.to[1]).toBeCloseTo(0, 3);
  });

  it('contour-anchor-fallback：compass 名（north）→ anchor 返回 undefined、compile 回退外接 AABB、不抛错', () => {
    expect(() =>
      compileToScene(
        scene([
          { type: 'node', id: 'c', position: [0, 0], shape: { type: 'contour', params: { points } } },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [200, 0] },
              { type: 'step', kind: 'line', to: { id: 'c', anchor: 'north' } },
            ],
          },
        ] as IR['children']),
      ),
    ).not.toThrow();
  });
});

// ════════════════ JSON round-trip ════════════════

describe('contour — JSON round-trip', () => {
  it('contour-json-roundtrip：{type:contour, params} 经 NodeSchema 序列化往返等价', () => {
    const node = {
      type: 'node',
      id: 'c',
      position: [0, 0],
      shape: {
        type: 'contour',
        params: {
          points: [
            [-24, 40],
            [24, 28],
            [24, -40],
            [-24, -40],
          ],
          cornerRadius: 4,
        },
      },
    };
    const parsed = NodeSchema.parse(node);
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shape).toEqual(parsed.shape);
  });
});
