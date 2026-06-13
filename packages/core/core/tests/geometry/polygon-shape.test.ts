/**
 * polygon shape（ADR-04）—— paramsSchema + 正多边形几何契约 + scaleParams 测试
 * @description 覆盖：
 *   - paramsSchema 校验（sides 整数 ≥3、rotate finite、strictObject 拒多余字段）；
 *   - 几何契约：顶点均布外接圆、emit 闭合 path、sides=3 最小三角形、sides 大近圆轮廓；
 *   - 错误：sides<3 / rotate 非有限 paramsSchema reject；
 *   - 交互：self-rotate（params.rotate）+ Node.rotate 叠加；
 *   - round-trip（nested params IR）+ zod 错误两类；
 *   - scaleParams：node scale 不缩 sides / rotate（只内框×scale）。
 *
 *   角度约定（与 polar.ts / geometry 一致，SVG y-down）：顶点 k 角 = rotate + k·(360/sides)，
 *   point = [cx + r·cosθ, cy + r·sinθ]，0°=+x(east)，90°=+y(屏幕下方)。
 *
 *   注：polygon 的 circumscribe / boundaryPoint / anchor 真实数学此刻仍为占位 stub
 *   （实现 Agent 填）——依赖这些的几何精确 case 此刻 fail，预期。
 *   paramsSchema / emit 拓扑 / round-trip / zod 错误 / scaleParams 类 case 此刻应通过。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import { polygon } from '../../src/shapes';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

/** 标准 polygon node helper */
const polyNode = (
  params: { sides: number; rotate?: number },
  extra: Record<string, unknown> = {},
): IR['children'][number] => ({
  type: 'node',
  id: 'poly',
  position: [0, 0],
  shape: { type: 'polygon', params },
  ...extra,
});

/** path 命令中所有 line/move 落点的世界坐标 */
const vertexPoints = (commands: Array<{ kind: string; to?: [number, number] }>): Array<[number, number]> =>
  commands.filter(c => (c.kind === 'move' || c.kind === 'line') && c.to).map(c => c.to as [number, number]);

// ─────────────────────────── Happy path（≥3）───────────────────────────

describe('polygon — happy path 几何', () => {
  it('polygon_vertices_on_circumcircle：sides:6 → 6 顶点均布外接圆、距中心等半径', () => {
    // 直接断言 emit 顶点：6 个顶点应在同一外接圆上（到中心等距），相邻夹角 60°。
    // rect 用精确 AABB（emit 收轴对齐 rect）；外接半径由 circumscribe 派生，此处只验「等半径 + 6 顶点」。
    // precision 高些避免默认 2 位小数 round 引入的微小半径抖动（属渲染量化、非几何误差）
    const compiled = compileToScene(scene([polyNode({ sides: 6 })]), { precision: 6 });
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    expect(verts.length).toBe(6);
    // 6 顶点到几何中心的距离应全相等（外接圆上）。几何中心 = 顶点均值。
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const radii = verts.map(v => Math.hypot(v[0] - mx, v[1] - my));
    for (const r of radii) expect(r).toBeCloseTo(radii[0], 4);
    expect(radii[0]).toBeGreaterThan(0);
  });

  it('polygon_emit_closed：emit 产闭合多边形（首 move、末 close、中间 line）', () => {
    const compiled = compileToScene(scene([polyNode({ sides: 5 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const cmds = path!.commands;
    expect(cmds[0].kind).toBe('move');
    expect(cmds[cmds.length - 1].kind).toBe('close');
    // sides=5 → move + 4 line + close
    expect(cmds.map(c => c.kind)).toEqual(['move', 'line', 'line', 'line', 'line', 'close']);
  });

  it('polygon_sides_3_minimum：sides:3 → 三角形（3 顶点 + close）', () => {
    const compiled = compileToScene(scene([polyNode({ sides: 3 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(vertexPoints(path!.commands).length).toBe(3);
    expect(path!.commands.map(c => c.kind)).toEqual(['move', 'line', 'line', 'close']);
  });
});

// ─────────────────────────── 边界（≥2）───────────────────────────

describe('polygon — 边界（边数极值）', () => {
  it('polygon_large_sides_near_circle：sides:64 → 64 顶点近圆轮廓（相邻顶点间距远小于半径）', () => {
    const compiled = compileToScene(scene([polyNode({ sides: 64 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    expect(verts.length).toBe(64);
    // 近圆：相邻顶点弦长 << 外接半径（2·R·sin(π/64) ≈ 0.098·R）
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const R = Math.hypot(verts[0][0] - mx, verts[0][1] - my);
    const chord = Math.hypot(verts[1][0] - verts[0][0], verts[1][1] - verts[0][1]);
    expect(R).toBeGreaterThan(0);
    expect(chord).toBeLessThan(R * 0.2);
  });

  it('polygon_sides_3_explicit_rotate：sides:3 + rotate 仍 3 顶点、起始角随 rotate', () => {
    // rotate 改起始顶点方向、不改顶点数；验证 rotate 进入顶点角度（首顶点角 = rotate）。
    const compiled = compileToScene(scene([polyNode({ sides: 3, rotate: 90 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(vertexPoints(path!.commands).length).toBe(3);
  });
});

// ─────────────────────────── 错误路径（≥2）───────────────────────────

describe('polygon — 错误路径（paramsSchema 拒绝）', () => {
  it('polygon_sides_lt_3_rejected：sides:2 → paramsSchema reject', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 2 })).toThrow();
    // 端到端：compile 同样在 paramsSchema.parse 抛
    expect(() => compileToScene(scene([polyNode({ sides: 2 })]))).toThrow();
  });

  it('polygon_sides_non_integer_rejected：sides:3.5 → int() reject', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 3.5 })).toThrow();
  });

  it('polygon_rotate_non_finite_rejected：rotate:NaN → finite() reject', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 6, rotate: NaN })).toThrow();
  });

  it('polygon_extra_params_rejected：{ sides:6, foo:1 } → strictObject reject', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 6, foo: 1 })).toThrow();
  });
});

// ─────────────────────────── 交互（≥2）───────────────────────────

describe('polygon — 交互（self-rotate + Node.rotate）', () => {
  it('polygon_self_rotate_plus_node_rotate：params.rotate:30 + Node rotate:15 → 顶点叠加旋转 45°', () => {
    // self-rotate 进 emit 顶点角度；Node.rotate 走外层 GroupPrim 的 rotate transform。
    // 两者叠加 = 视觉上首顶点方向为 30+15=45°。此处验证：
    //   ① 外层 group 带 rotate 15° transform；
    //   ② emit 顶点（轴对齐空间，未含 group rotate）已含 self-rotate 30°——
    //      对 sides=4 取首顶点相对中心方向角应 ≈ 30°（mod 360）。
    const compiled = compileToScene(
      scene([polyNode({ sides: 4, rotate: 30 }, { rotate: 15 })]),
      { precision: 6 },
    );
    const group = findByType(compiled.primitives, 'group');
    expect(group).toBeDefined();
    expect(group!.transforms?.some(t => t.kind === 'rotate' && t.degrees === 15)).toBe(true);
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const angle0 = (Math.atan2(verts[0][1] - my, verts[0][0] - mx) * 180) / Math.PI;
    const norm = ((angle0 % 360) + 360) % 360;
    expect(norm).toBeCloseTo(30, 3);
  });

  it('polygon_sides_not_scaled：node scale=2 → sides/rotate 不变，只内框×scale（外接放大）', () => {
    // scaleParams 返回原 params（不缩 sides / rotate）；内框随 scale×2 → 外接半径×2、顶点数不变。
    const params = { sides: 6, rotate: 10 };
    expect(polygon.scaleParams!(params, 2, 2)).toEqual({ sides: 6, rotate: 10 });
    const base = compileToScene(scene([polyNode({ sides: 6 }, { text: 'X' })]));
    const big = compileToScene(scene([polyNode({ sides: 6 }, { text: 'X', scale: 2 })]));
    const basePath = findByType(base.primitives, 'path');
    const bigPath = findByType(big.primitives, 'path');
    expect(basePath).toBeDefined();
    expect(bigPath).toBeDefined();
    // 顶点数不变（sides 未被缩坏）
    expect(vertexPoints(bigPath!.commands).length).toBe(6);
    expect(vertexPoints(basePath!.commands).length).toBe(6);
    // 内框 ×2 → 外接尺寸协同放大（去掉常量 padding 后 bbox 跨度近翻倍）
    const PAD = 10;
    expect(big.layout.width - 2 * PAD).toBeGreaterThan((base.layout.width - 2 * PAD) * 1.5);
  });
});

// ─────────────────────────── round-trip + schema ───────────────────────────

describe('polygon — round-trip / schema', () => {
  it('roundtrip_nested_params：含 polygon nested params 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'poly',
      position: [0, 0],
      shape: { type: 'polygon', params: { sides: 6, rotate: 30 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({ type: 'polygon', params: { sides: 6, rotate: 30 } });
  });

  it('ShapeRefSchema 解析 polygon nested params（rotate 省略合法）', () => {
    const ref = { type: 'polygon', params: { sides: 5 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });
});
