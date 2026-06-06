/**
 * star shape（ADR-05）—— paramsSchema + 星形几何契约 + scaleParams 测试
 * @description 覆盖：
 *   - paramsSchema 校验（points 整数 ≥3、内外半径 finite positive、outerRadius>innerRadius、strictObject 拒多余/缺字段）；
 *   - 几何契约：2×points 顶点外径尖角 / 内径凹角交替均布、emit 闭合 path、tip-N / notch-N / center anchor、
 *     rotate:0 第一尖角在 polar 0°(+x)、points:3 最小三角星、innerRadius→outerRadius 近正多边形、rotate 360° 等价；
 *   - 错误：points<3 / outerRadius≤innerRadius / 缺字段 paramsSchema reject；
 *   - 交互：self-rotate（params.rotate）+ Node.rotate 叠加、× scale 尺寸协同、Path 连接 tip-0；
 *   - round-trip（nested params IR）+ zod 错误两类；
 *   - scaleParams：node scale 只缩 inner/outerRadius、不缩 points / rotate。
 *
 *   角度约定（与 polar.ts / geometry 一致，SVG y-down）：顶点 k 角 = (rotate ?? 0) + k·(180/points)，
 *   point = [cx + r·cosθ, cy + r·sinθ]，偶 k 取 outerRadius（尖角 tip）、奇 k 取 innerRadius（凹角 notch），
 *   0°=+x(east)，90°=+y(屏幕下方)。
 *
 *   注：star.ts 的几何四函数（starGeometry 真值）此刻仍是占位 stub（实现 Agent 填真实数学）——
 *   依赖 circumscribe / emit / boundaryPoint / anchor 真实几何的 case 此刻 fail，预期。
 *   paramsSchema / round-trip / zod 错误 / scaleParams 类 case 此刻应通过。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import { star } from '../../src/shapes';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const allByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Array<Extract<ScenePrimitive, { type: T }>> =>
  flattenPrims(prims).filter((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

/** 标准 star node helper：5 尖角、innerRadius=16、outerRadius=40 */
const starNode = (
  params: { points: number; innerRadius: number; outerRadius: number; rotate?: number },
  extra: Record<string, unknown> = {},
): IR['children'][number] => ({
  type: 'node',
  id: 'star',
  position: [0, 0],
  shape: { type: 'star', params },
  ...extra,
});

/** path 命令中所有 line/move 落点的世界坐标 */
const vertexPoints = (commands: Array<{ kind: string; to?: [number, number] }>): Array<[number, number]> =>
  commands.filter(c => (c.kind === 'move' || c.kind === 'line') && c.to).map(c => c.to as [number, number]);

// ─────────────────────────── Happy path（≥3）───────────────────────────

describe('star — happy path 几何', () => {
  it('star_2n_vertices_alternating：points:5 → 10 顶点、外/内径交替均布（外径 40、内径 16、36° 步进）', () => {
    // 顶点 k 角 = k·(180/5)=k·36°；偶 k 取 outerRadius=40（尖角）、奇 k 取 innerRadius=16（凹角）。
    // rect 用精确 AABB（emit 收轴对齐 rect），star 关于中心对称 → 几何中心 = 顶点均值。precision 高避免 round 抖动。
    const compiled = compileToScene(
      scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40 })]),
      { precision: 6 },
    );
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    expect(verts.length).toBe(10);
    // 几何中心 = 顶点均值（对称星形）。各顶点到中心距离应在 {40, 16} 两值交替。
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const radii = verts.map(v => Math.hypot(v[0] - mx, v[1] - my));
    radii.forEach((r, i) => {
      expect(r).toBeCloseTo(i % 2 === 0 ? 40 : 16, 3);
    });
    // 相邻顶点（同一径上）夹角应均布 36°——验证顶点 0（尖角）方向与顶点 2（下一尖角）方向差 72°。
    const ang = (v: [number, number]): number =>
      (((Math.atan2(v[1] - my, v[0] - mx) * 180) / Math.PI) % 360 + 360) % 360;
    expect(((ang(verts[2]) - ang(verts[0])) % 360 + 360) % 360).toBeCloseTo(72, 3);
  });

  it('star_emit_closed：emit 产闭合星形 path（首 move、末 close、中间 line × 9）', () => {
    const compiled = compileToScene(scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const cmds = path!.commands;
    expect(cmds[0].kind).toBe('move');
    expect(cmds[cmds.length - 1].kind).toBe('close');
    // points=5 → 10 顶点：move + 9 line + close
    expect(cmds.map(c => c.kind)).toEqual([
      'move', 'line', 'line', 'line', 'line', 'line', 'line', 'line', 'line', 'line', 'close',
    ]);
  });

  it('star_anchors：tip-0 / notch-0 / center 坐标符几何', () => {
    // points:5 star，圆心局部原点。AABB：x∈[-40,40]（顶点 0=(40,0)、顶点 5=(-40,0)…），
    // 精确 AABB 中心 = 原点（对称）。rect 取 AABB（中心 (0,0)、半轴由 circumscribe 派生）。
    // 这里直接用 star.anchor 验三个特征点（rect 用以中心为原点的对称 AABB）。
    const params = { points: 5, innerRadius: 16, outerRadius: 40 };
    const { halfWidth, halfHeight } = star.circumscribe(0, 0, params);
    const rect = { x: 0, y: 0, width: 2 * halfWidth, height: 2 * halfHeight, rotate: 0 };
    // center = 星形中心 = 世界原点
    const center = star.anchor(rect, 'center', params);
    expect(center).toBeDefined();
    expect(center![0]).toBeCloseTo(0, 6);
    expect(center![1]).toBeCloseTo(0, 6);
    // tip-0 = 顶点 0（尖角）= outerRadius 在 0° = (40, 0)
    const tip0 = star.anchor(rect, 'tip-0', params);
    expect(tip0).toBeDefined();
    expect(tip0![0]).toBeCloseTo(40, 4);
    expect(tip0![1]).toBeCloseTo(0, 4);
    // notch-0 = 顶点 1（凹角）= innerRadius 在 36° = (16cos36, 16sin36)
    const notch0 = star.anchor(rect, 'notch-0', params);
    expect(notch0).toBeDefined();
    expect(notch0![0]).toBeCloseTo(16 * Math.cos((36 * Math.PI) / 180), 4);
    expect(notch0![1]).toBeCloseTo(16 * Math.sin((36 * Math.PI) / 180), 4);
  });

  it('star_default_first_tip_at_zero：rotate:0 → 第一尖角（tip-0）在 polar 0°(+x)', () => {
    const params = { points: 6, innerRadius: 20, outerRadius: 50 };
    const { halfWidth, halfHeight } = star.circumscribe(0, 0, params);
    const rect = { x: 0, y: 0, width: 2 * halfWidth, height: 2 * halfHeight, rotate: 0 };
    const tip0 = star.anchor(rect, 'tip-0', params);
    expect(tip0).toBeDefined();
    // 第一尖角方向角 = 0°（+x），半径 = outerRadius = 50
    const angle = (Math.atan2(tip0![1], tip0![0]) * 180) / Math.PI;
    expect(((angle % 360) + 360) % 360).toBeCloseTo(0, 4);
    expect(Math.hypot(tip0![0], tip0![1])).toBeCloseTo(50, 4);
  });
});

// ─────────────────────────── 边界（≥2）───────────────────────────

describe('star — 边界', () => {
  it('star_points_3_minimum：points:3 → 三角星（6 顶点 + close）', () => {
    const compiled = compileToScene(scene([starNode({ points: 3, innerRadius: 10, outerRadius: 30 })]));
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(vertexPoints(path!.commands).length).toBe(6);
    expect(path!.commands.map(c => c.kind)).toEqual([
      'move', 'line', 'line', 'line', 'line', 'line', 'close',
    ]);
  });

  it('star_inner_near_outer_degenerates：innerRadius→outerRadius → 近正多边形（凹角半径≈尖角半径）', () => {
    // innerRadius 接近 outerRadius → 凹角几乎与尖角同半径 → 轮廓近正 2·points 边形。
    const compiled = compileToScene(
      scene([starNode({ points: 5, innerRadius: 39.5, outerRadius: 40 })]),
      { precision: 6 },
    );
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    expect(verts.length).toBe(10);
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    const radii = verts.map(v => Math.hypot(v[0] - mx, v[1] - my));
    // 所有顶点半径都接近（内外径差 ≤ 0.5），近正 10 边形。
    const maxR = Math.max(...radii);
    const minR = Math.min(...radii);
    expect(maxR - minR).toBeLessThan(1);
  });

  it('star_rotate_wraps：rotate:360+k 与 rotate:k 顶点等价', () => {
    const base = { points: 5, innerRadius: 16, outerRadius: 40, rotate: 20 };
    const wrapped = { points: 5, innerRadius: 16, outerRadius: 40, rotate: 380 };
    const b = star.circumscribe(0, 0, base);
    const rectB = { x: 0, y: 0, width: 2 * b.halfWidth, height: 2 * b.halfHeight, rotate: 0 };
    const w = star.circumscribe(0, 0, wrapped);
    const rectW = { x: 0, y: 0, width: 2 * w.halfWidth, height: 2 * w.halfHeight, rotate: 0 };
    const tipB = star.anchor(rectB, 'tip-0', base);
    const tipW = star.anchor(rectW, 'tip-0', wrapped);
    expect(tipB).toBeDefined();
    expect(tipW).toBeDefined();
    expect(tipW![0]).toBeCloseTo(tipB![0], 4);
    expect(tipW![1]).toBeCloseTo(tipB![1], 4);
  });
});

// ─────────────────────────── 错误路径（≥2）───────────────────────────

describe('star — 错误路径（paramsSchema 拒绝）', () => {
  it('star_points_lt_3_rejected：points:2 → paramsSchema reject', () => {
    expect(() => star.paramsSchema.parse({ points: 2, innerRadius: 16, outerRadius: 40 })).toThrow();
    // 端到端：compile 同样在 paramsSchema.parse 抛
    expect(() =>
      compileToScene(scene([starNode({ points: 2, innerRadius: 16, outerRadius: 40 })])),
    ).toThrow();
  });

  it('star_outer_le_inner_rejected：outerRadius ≤ innerRadius → refine reject', () => {
    expect(() =>
      star.paramsSchema.parse({ points: 5, innerRadius: 40, outerRadius: 40 }),
    ).toThrow();
    expect(() =>
      compileToScene(scene([starNode({ points: 5, innerRadius: 50, outerRadius: 40 })])),
    ).toThrow();
  });

  it('star_missing_field_rejected：缺 outerRadius → strictObject reject', () => {
    expect(() => star.paramsSchema.parse({ points: 5, innerRadius: 16 })).toThrow();
  });

  it('star_extra_field_rejected：{ ...合法, foo:1 } → strictObject reject', () => {
    expect(() =>
      star.paramsSchema.parse({ points: 5, innerRadius: 16, outerRadius: 40, foo: 1 }),
    ).toThrow();
  });
});

// ─────────────────────────── 交互（≥2）───────────────────────────

describe('star — 交互（self-rotate / scale / Path 连接）', () => {
  it('star_self_rotate_plus_node_rotate：params.rotate:18 + Node rotate:12 → 顶点叠加旋转', () => {
    // self-rotate 进 emit 顶点角度；Node.rotate 走外层 GroupPrim 的 rotate transform。
    // 验证：① 外层 group 带 rotate 12° transform；② emit 顶点（轴对齐空间、未含 group rotate）
    //   已含 self-rotate 18°——首尖角 tip-0 相对中心方向角应 ≈ 18°。
    const compiled = compileToScene(
      scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40, rotate: 18 }, { rotate: 12 })]),
      { precision: 6 },
    );
    const group = findByType(compiled.primitives, 'group');
    expect(group).toBeDefined();
    expect(group!.transforms?.some(t => t.kind === 'rotate' && t.degrees === 12)).toBe(true);
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    const verts = vertexPoints(path!.commands);
    expect(verts.length).toBe(10);
    const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length;
    const my = verts.reduce((s, v) => s + v[1], 0) / verts.length;
    // 顶点 0 是首尖角（外径），方向角应 = self-rotate 18°（mod 360）
    const angle0 = (Math.atan2(verts[0][1] - my, verts[0][0] - mx) * 180) / Math.PI;
    expect(((angle0 % 360) + 360) % 360).toBeCloseTo(18, 3);
  });

  it('star_with_scale：node scale=2 → scaleParams 把 inner/outerRadius×2、points/rotate 不变', () => {
    const params = { points: 5, innerRadius: 16, outerRadius: 40, rotate: 10 };
    expect(star.scaleParams!(params, 2, 2)).toEqual({
      points: 5, innerRadius: 32, outerRadius: 80, rotate: 10,
    });
    // 端到端：scale:2 的 star → AABB 半轴随半径×2。去掉常量 padding（10/边）后 bbox 跨度严格翻倍。
    const PAD = 10;
    const base = compileToScene(scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40 })]));
    const big = compileToScene(scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40 }, { scale: 2 })]));
    expect(big.layout.width - 2 * PAD).toBeCloseTo((base.layout.width - 2 * PAD) * 2, 1);
    expect(big.layout.height - 2 * PAD).toBeCloseTo((base.layout.height - 2 * PAD) * 2, 1);
  });

  it('star_path_connect_tip：<Path from={{id:"star", anchor:"tip-0"}}> → 命中第一尖角', () => {
    // points:5 star 中心在原点、tip-0 = outerRadius 在 0° = (40, 0)。
    // 'tip-0' 是 star 自定 anchor，AnchorRefSchema 已放宽接受任意命名 anchor，可直接用对象形态。
    const connectPath: IR['children'][number] = {
      type: 'path',
      stroke: 'black',
      children: [
        { type: 'step', kind: 'move', to: { id: 'star', anchor: 'tip-0' } },
        { type: 'step', kind: 'line', to: [100, -20] },
      ],
    };
    const compiled = compileToScene(
      scene([starNode({ points: 5, innerRadius: 16, outerRadius: 40 }), connectPath]),
    );
    const paths = allByType(compiled.primitives, 'path');
    const connector = paths.find(p => p.commands.length === 2 && p.commands[0].kind === 'move');
    expect(connector).toBeDefined();
    const move = connector!.commands[0];
    if (move.kind === 'move') {
      expect(move.to[0]).toBeCloseTo(40, 2);
      expect(move.to[1]).toBeCloseTo(0, 2);
    }
  });
});

// ─────────────────────────── round-trip + schema ───────────────────────────

describe('star — round-trip / schema', () => {
  it('roundtrip_nested_params：含 star nested params 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'star',
      position: [0, 0],
      shape: { type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40, rotate: 18 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({
      type: 'star',
      params: { points: 5, innerRadius: 16, outerRadius: 40, rotate: 18 },
    });
  });

  it('ShapeRefSchema 解析 star nested params（rotate 省略合法）', () => {
    const ref = { type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });
});
