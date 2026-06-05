/**
 * sector shape（ADR-03）—— paramsSchema + 几何契约 + scaleParams 测试
 * @description 覆盖：
 *   - paramsSchema 校验（outerRadius>innerRadius、finite 角度、strictObject 缺字段拒绝）；
 *   - 几何契约：emit 外弧 + 径向边 + 内弧、命名 anchor、pie slice（innerRadius=0）、
 *     circumscribe 精确 AABB（含跨 90° 的 +y 极值点）、近全圆、end<start、position=AABB 中心；
 *   - 交互：rotate × sector、Path 连接 outer-arc-mid；
 *   - round-trip（nested params IR）+ zod 错误两类；
 *   - scaleParams：node scale 只缩半径、不缩角度。
 *
 *   角度约定（与 polar.ts / geometry/arc 一致，SVG y-down）：
 *     point = [cx + r·cosθ, cy + r·sinθ]，0°=+x(east)，90°=+y(屏幕下方)，180°=-x，270°=-y(屏幕上方)。
 *
 *   注：涉及 circumscribe / emit / boundaryPoint / anchor 真实几何的 case 此刻 fail
 *   （sector.ts 的几何四函数仍是占位 stub，实现 Agent 填真实数学）——预期。
 *   paramsSchema / scaleParams / round-trip / zod 错误类 case 此刻应通过。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ShapeRefSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import { sector } from '../../src/shapes';
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

/** 标准环楔 node helper：innerRadius=20, outerRadius=60, 0°→90° */
const wedgeNode = (
  params: { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number },
  extra: Record<string, unknown> = {},
): IR['children'][number] => ({
  type: 'node',
  id: 'wedge',
  position: [0, 0],
  shape: { type: 'sector', params },
  ...extra,
});

// ─────────────────────────── Happy path（≥3）───────────────────────────

describe('sector — happy path 几何', () => {
  it('sector_emit_outline：innerRadius>0 → emit 出闭合 path（外弧 + 两径向边 + 内弧）', () => {
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 })]),
    );
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    // 环楔轮廓应是闭合 path（含 close 命令）
    expect(path!.commands.some(c => c.kind === 'close')).toBe(true);
  });

  it('sector_anchors_correct：outer-arc-mid / inner-arc-mid / apex / centroid 坐标符几何', () => {
    // 直接断言 shape.anchor（rect 用精确 AABB）：apex（圆心）/ centroid / inner-arc-mid / outer-arc-mid。
    // 0→90 sector AABB：x∈[0,60], y∈[0,60] → 中心 (30,30)、半轴 30。圆心(apex) 在 AABB 局部 (-30,-30) 即世界 (0,0)。
    const rect = { x: 30, y: 30, width: 60, height: 60, rotate: 0 };
    const params = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
    // apex = 圆心 = 世界原点 (0,0)
    const apex = sector.anchor(rect, 'apex', params);
    expect(apex).toBeDefined();
    expect(apex![0]).toBeCloseTo(0, 6);
    expect(apex![1]).toBeCloseTo(0, 6);
    // outer-arc-mid：圆心 + outerRadius 在中分角 45° 方向 = (60cos45, 60sin45) = (42.43, 42.43)
    const outerMid = sector.anchor(rect, 'outer-arc-mid', params);
    expect(outerMid).toBeDefined();
    expect(outerMid![0]).toBeCloseTo(60 * Math.cos(Math.PI / 4), 4);
    expect(outerMid![1]).toBeCloseTo(60 * Math.sin(Math.PI / 4), 4);
    // inner-arc-mid：圆心 + innerRadius 在 45° 方向 = (20cos45, 20sin45)
    const innerMid = sector.anchor(rect, 'inner-arc-mid', params);
    expect(innerMid).toBeDefined();
    expect(innerMid![0]).toBeCloseTo(20 * Math.cos(Math.PI / 4), 4);
    expect(innerMid![1]).toBeCloseTo(20 * Math.sin(Math.PI / 4), 4);
    // centroid：在环楔内（介于内外弧之间、45° 方向上），半径应落在 (innerRadius, outerRadius) 之间
    const centroid = sector.anchor(rect, 'centroid', params);
    expect(centroid).toBeDefined();
    const cr = Math.hypot(centroid![0], centroid![1]);
    expect(cr).toBeGreaterThan(20);
    expect(cr).toBeLessThan(60);
  });

  it('sector_pie_slice：innerRadius=0 → 实心扇片（径向边交于圆心、无内弧段）', () => {
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 0, outerRadius: 60, startAngle: 0, endAngle: 90 })]),
    );
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    // 扇片只有一段外弧 + 两径向边到圆心，弧命令应只有 1 段（内弧不存在）
    const arcCmds = path!.commands.filter(c => c.kind === 'arc');
    expect(arcCmds.length).toBe(1);
  });
});

// ─────────────────────────── 边界（≥2）───────────────────────────

describe('sector — 边界 AABB / 角度', () => {
  it('sector_aabb_includes_axis_extrema：弧跨 90°（45→135）→ AABB 含 +y 方向 outerRadius 极值点', () => {
    // 圆心(0,0)；外弧端点 (60cos45,60sin45)=(42.43,42.43)、(60cos135,60sin135)=(-42.43,42.43)；
    // 弧跨过 90° → +y 极值点 (0, 60)。内弧端点半径 20 同样落在 y 正区。apex (0,0)。
    // 精确 AABB：x∈[-42.426,42.426]，y∈[0,60] → halfWidth=30√2≈42.426，halfHeight=30。
    const params = { innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135 };
    const { halfWidth, halfHeight } = sector.circumscribe(0, 0, params);
    expect(halfWidth).toBeCloseTo(60 * Math.SQRT1_2, 4); // 30√2 ≈ 42.426
    expect(halfHeight).toBeCloseTo(30, 4); // (0 .. 60) 跨度 60 → 半轴 30
  });

  it('sector_near_full_circle：end−start 接近 360° → AABB 近 2·outerRadius 方框', () => {
    // 0°→359° 几乎全圆：四个轴向极值 (±60,0)/(0,±60) 都被扫到 → AABB 近 120×120、半轴近 60。
    const params = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 359 };
    const { halfWidth, halfHeight } = sector.circumscribe(0, 0, params);
    expect(halfWidth).toBeCloseTo(60, 1);
    expect(halfHeight).toBeCloseTo(60, 1);
  });

  it('sector_end_before_start：endAngle<startAngle → 按约定产合法环楔（emit 不抛、AABB 非退化）', () => {
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 120, endAngle: 30 })]),
    );
    const path = findByType(compiled.primitives, 'path');
    expect(path).toBeDefined();
    expect(compiled.layout.width).toBeGreaterThan(0);
    expect(compiled.layout.height).toBeGreaterThan(0);
  });
});

// ─────────────────────────── 错误路径（≥2）───────────────────────────

describe('sector — 错误路径（paramsSchema 拒绝）', () => {
  it('sector_outer_le_inner_rejected：outerRadius ≤ innerRadius → 编译期拒绝', () => {
    const ir = scene([wedgeNode({ innerRadius: 60, outerRadius: 60, startAngle: 0, endAngle: 90 })]);
    expect(() => compileToScene(ir)).toThrow();
  });

  it('sector_non_finite_angle_rejected：startAngle:Infinity → paramsSchema reject', () => {
    const ref = { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: Infinity, endAngle: 90 } };
    // finite() 拒绝 Infinity；裸 schema parse 即报错（不依赖 compile）
    expect(() => sector.paramsSchema.parse(ref.params)).toThrow();
  });

  it('sector_missing_field_rejected：缺 outerRadius → strictObject reject', () => {
    expect(() =>
      sector.paramsSchema.parse({ innerRadius: 20, startAngle: 0, endAngle: 90 }),
    ).toThrow();
  });
});

// ─────────────────────────── 交互（≥2）───────────────────────────

describe('sector — 交互（rotate / Path 连接 / position）', () => {
  it('sector_with_rotate：Node rotate × sector → 仍 emit、外层 group 带 rotate transform（绕 AABB 中心）', () => {
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 }, { rotate: 30 })]),
    );
    const group = findByType(compiled.primitives, 'group');
    expect(group).toBeDefined();
    expect(group!.transforms?.some(t => t.kind === 'rotate' && t.degrees === 30)).toBe(true);
  });

  it('sector_path_connect_outer_arc：<Path from={{id:"wedge", anchor:"outer-arc-mid"}}> → 命中外弧中点', () => {
    // wedge 圆心在原点、0→90 中分角 45°，outer-arc-mid 世界坐标 (60cos45, 60sin45)。
    // 注：'outer-arc-mid' 是 sector 自定 anchor，不在当前 AnchorRefSchema 的 9 名枚举内——
    //   实现 Agent 需把 AnchorRefSchema 放宽为接受任意字符串 anchor（交给 shapeDef.anchor 解释），
    //   否则该 target 静态类型不合法。此处用 IRChild 形态构造（运行时由 anchorOf 解析）。
    const connectPath = {
      type: 'path',
      stroke: 'black',
      children: [
        { type: 'step', kind: 'move', to: { id: 'wedge', anchor: 'outer-arc-mid' } },
        { type: 'step', kind: 'line', to: [120, -20] },
      ],
    } as unknown as IR['children'][number];
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 }), connectPath]),
    );
    const paths = allByType(compiled.primitives, 'path');
    // 找到那条 from→to 连接线（含两个命令、起点在外弧中点附近）
    const connector = paths.find(p => p.commands.length === 2 && p.commands[0].kind === 'move');
    expect(connector).toBeDefined();
    const move = connector!.commands[0];
    if (move.kind === 'move') {
      expect(move.to[0]).toBeCloseTo(60 * Math.cos(Math.PI / 4), 2);
      expect(move.to[1]).toBeCloseTo(60 * Math.sin(Math.PI / 4), 2);
    }
  });

  it('sector_position_is_aabb_center：viewBox / layout bbox 与 layout.rect 四角一致（position=AABB 中心，不裁弧）', () => {
    // 45→135 sector：精确 AABB y∈[0,60]、x∈[-30√2,30√2]。position=AABB 中心 → rect 四角覆盖整个弧顶 (0,60)。
    // layout 在 bbox 外加 padding=10/边（computeLayout）：height = 60 + 20、width = 2·30√2 + 20。
    const PAD = 10;
    const compiled = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135 })]),
    );
    // bbox 高度 = 弧顶极值跨度 60（不被裁成端点跨度 2·30=60... 端点 y=60sin45≈42.43，弧顶 60）。
    expect(compiled.layout.height - 2 * PAD).toBeCloseTo(60, 1);
    // bbox 宽度 = 2×30√2（两侧端点 ±60cos45）含两侧端点
    expect(compiled.layout.width - 2 * PAD).toBeCloseTo(2 * 60 * Math.SQRT1_2, 1);
  });
});

// ─────────────────────────── round-trip + scaleParams ───────────────────────────

describe('sector — round-trip / schema / scaleParams', () => {
  it('roundtrip_nested_params：含 sector nested params 的 IR → JSON → parse 等价', () => {
    const node = {
      type: 'node',
      id: 'wedge',
      position: [0, 0],
      shape: { type: 'sector', params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 } },
    };
    const parsed = NodeSchema.parse(node);
    const roundTripped = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(roundTripped).toEqual(parsed);
    expect(roundTripped.shape).toEqual({
      type: 'sector',
      params: { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 },
    });
  });

  it('ShapeRefSchema 解析 sector nested params', () => {
    const ref = { type: 'sector', params: { innerRadius: 0, outerRadius: 50, startAngle: -30, endAngle: 210 } };
    expect(ShapeRefSchema.parse(ref)).toEqual(ref);
  });

  it('sector_scale_preserves_angle：node scale=2 → scaleParams 把半径×2、startAngle/endAngle 不变', () => {
    // 半径是长度（随 scale 协同放大），角度是方向（缩放不改方向）——scaleParams 只缩 inner/outerRadius。
    const params = { innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135 };
    const scaled = sector.scaleParams!(params, 2, 2);
    expect(scaled).toEqual({ innerRadius: 40, outerRadius: 120, startAngle: 45, endAngle: 135 });
    // 端到端：compile 带 scale:2 的 sector → AABB 半轴随半径×2（角度不变，仍跨 90° 含 +y 极值）。
    // 去掉常量 padding（10/边）后，bbox 跨度应严格翻倍。
    const PAD = 10;
    const base = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135 })]),
    );
    const big = compileToScene(
      scene([wedgeNode({ innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135 }, { scale: 2 })]),
    );
    expect(big.layout.height - 2 * PAD).toBeCloseTo((base.layout.height - 2 * PAD) * 2, 1);
    expect(big.layout.width - 2 * PAD).toBeCloseTo((base.layout.width - 2 * PAD) * 2, 1);
  });
});
