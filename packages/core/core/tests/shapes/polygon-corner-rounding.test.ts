/**
 * polygon cornerRadius（ADR-07 统一圆角）—— params + emit fillet 弧 + boundary 感知 + r=0 等价 + scaleParams
 * @description 覆盖：
 *   - paramsSchema：cornerRadius 可选 nonnegative finite，负值 / 非有限 reject；
 *   - emit：cornerRadius>0 path 含 fillet arc 命令；
 *   - boundary-aware：朝顶点方向 boundaryPoint 落 fillet 弧上（≠ 尖顶点）；cornerRadius=0 = 尖顶点；
 *   - r=0 等价：省略 cornerRadius → emit / boundaryPoint 逐字段同现状（直接对照原始尖角轮廓数学）；
 *   - scaleParams：scale=2 → cornerRadius×2、sides/rotate 不变；
 *   - circumscribe 不随 cornerRadius 变（AABB = 尖角极值）。
 */
import { describe, expect, it } from 'vitest';
import { polygon } from '../../src/shapes';
import type { Rect } from '../../src/shapes';
import type { Position } from '../../src/geometry/point';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const identity = (n: number): number => n;

/** 轴对齐 rect（emit / boundaryPoint 都接受；boundaryPoint 含 rotate 语义但此处 rotate=0） */
const squareRect = (size = 120): Rect => ({ x: 0, y: 0, width: size, height: size, rotate: 0 });

describe('polygon cornerRadius — paramsSchema', () => {
  it('cornerRadius optional + nonnegative finite', () => {
    expect(polygon.paramsSchema.parse({ sides: 6 })).toEqual({ sides: 6 });
    expect(polygon.paramsSchema.parse({ sides: 6, cornerRadius: 8 })).toEqual({ sides: 6, cornerRadius: 8 });
    expect(polygon.paramsSchema.parse({ sides: 6, cornerRadius: 0 })).toEqual({ sides: 6, cornerRadius: 0 });
  });

  it('negative_cornerRadius_rejected', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 6, cornerRadius: -1 })).toThrow();
  });

  it('non_finite_cornerRadius_rejected', () => {
    expect(() => polygon.paramsSchema.parse({ sides: 6, cornerRadius: Infinity })).toThrow();
    expect(() => polygon.paramsSchema.parse({ sides: 6, cornerRadius: NaN })).toThrow();
  });

  it('sides 有有限上限', () => {
    expect(polygon.paramsSchema.parse({ sides: 1024 })).toEqual({ sides: 1024 });
    expect(() => polygon.paramsSchema.parse({ sides: 1025 })).toThrow();
  });
});

describe('polygon cornerRadius — emit', () => {
  it('polygon_cornerRadius_emit：sides:6 cornerRadius:8 → path 含 fillet arc 命令', () => {
    const rect = squareRect();
    const prims = [...polygon.emit(rect, {}, round2, { sides: 6, cornerRadius: 8 })];
    expect(prims.length).toBe(1);
    const path = prims[0];
    expect(path.type).toBe('path');
    if (path.type !== 'path') throw new Error('expected path');
    const kinds = path.commands.map(c => c.kind);
    // 含 arc（fillet 弧）；首 move、末 close
    expect(kinds[0]).toBe('move');
    expect(kinds[kinds.length - 1]).toBe('close');
    expect(kinds.filter(k => k === 'arc').length).toBe(6); // 每个顶点一段 fillet 弧
    expect(kinds.filter(k => k === 'line').length).toBe(6); // 每条边一段缩短直线
  });

  it('polygon_cornerRadius_emit_wrap_arc_short：跨 ±180° 的 fillet 仍输出短弧', () => {
    const rect = squareRect();
    const prims = [...polygon.emit(rect, {}, round2, { sides: 6, cornerRadius: 8 })];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    const arcs = path.commands.filter((cmd): cmd is Extract<(typeof path.commands)[number], { kind: 'arc' }> => cmd.kind === 'arc');
    expect(arcs.length).toBe(6);
    for (const arc of arcs) {
      expect(Math.abs(arc.endAngle - arc.startAngle)).toBeLessThanOrEqual(180);
    }
  });
});

describe('polygon cornerRadius — boundary aware', () => {
  // sides=4 rotate=0：顶点角 0/90/180/270；首顶点在 +x 方向（east）。朝首顶点方向 [1,0] 射线，
  //   r=0 命中尖顶点（外接半径处）；r>0 命中被磨圆的 fillet 弧（离中心更近）。
  it('polygon_boundary_aware：朝顶点方向 r>0 落 fillet 弧（≠ 尖顶点），r=0 = 尖顶点', () => {
    const rect = squareRect();
    const toward: Position = [1000, 0]; // 朝 +x 顶点方向
    const sharp = polygon.boundaryPoint(rect, toward, { sides: 4 });
    const rounded = polygon.boundaryPoint(rect, toward, { sides: 4, cornerRadius: 20 });
    // 朝顶点方向：尖角点离中心最远（外接半径）；倒角后该方向边界更靠近中心
    const distSharp = Math.hypot(sharp[0], sharp[1]);
    const distRounded = Math.hypot(rounded[0], rounded[1]);
    expect(distRounded).toBeLessThan(distSharp - 1e-6);
    // r=0 与尖角一致（顶点在外接半径上、朝 +x）
    expect(sharp[1]).toBeCloseTo(0, 6);
    expect(sharp[0]).toBeGreaterThan(0);
  });

  it('polygon_boundary_r0_eq_sharp：cornerRadius:0 boundary = 省略 cornerRadius', () => {
    const rect = squareRect();
    const toward: Position = [300, 130];
    const omitted = polygon.boundaryPoint(rect, toward, { sides: 5, rotate: 12 });
    const zero = polygon.boundaryPoint(rect, toward, { sides: 5, rotate: 12, cornerRadius: 0 });
    expect(zero[0]).toBeCloseTo(omitted[0], 9);
    expect(zero[1]).toBeCloseTo(omitted[1], 9);
  });
});

describe('polygon cornerRadius — r=0 equivalence to current sharp-corner output', () => {
  // 现状参考实现：emit = move(v0) + line(v1..v_{n-1}) + close（顶点过 round），无回起点冗余 line。
  const sharpEmitReference = (
    rect: Rect,
    round: (n: number) => number,
    params: { sides: number; rotate?: number },
  ): Array<{ kind: string; to?: [number, number] }> => {
    const DEG = Math.PI / 180;
    const startDeg = params.rotate ?? 0;
    const stepDeg = 360 / params.sides;
    const maxAbsCos = Math.max(
      ...Array.from({ length: params.sides }, (_, k) => Math.abs(Math.cos((startDeg + k * stepDeg) * DEG))),
    );
    const radius = rect.width / 2 / maxAbsCos;
    const out: Array<{ kind: string; to?: [number, number] }> = [];
    for (let k = 0; k < params.sides; k++) {
      const a = (startDeg + k * stepDeg) * DEG;
      const v: [number, number] = [
        round(rect.x + radius * Math.cos(a)),
        round(rect.y + radius * Math.sin(a)),
      ];
      out.push({ kind: k === 0 ? 'move' : 'line', to: v });
    }
    out.push({ kind: 'close' });
    return out;
  };

  it('polygon_r0_equiv_emit：省略 cornerRadius emit 逐字段同现状尖角输出', () => {
    const rect = squareRect();
    const cases: Array<{ sides: number; rotate?: number }> = [
      { sides: 3 },
      { sides: 5, rotate: 17 },
      { sides: 6 },
      { sides: 8, rotate: -30 },
    ];
    for (const params of cases) {
      const prims = [...polygon.emit(rect, {}, round2, params)];
      const path = prims[0];
      if (path.type !== 'path') throw new Error('expected path');
      const expected = sharpEmitReference(rect, round2, params);
      expect(path.commands).toEqual(expected);
    }
  });

  it('polygon_r0_equiv_emit_unrounded：identity round 下顶点逐字等价（无 round 时机差异）', () => {
    const rect = squareRect(137);
    const params = { sides: 7, rotate: 23 };
    const prims = [...polygon.emit(rect, {}, identity, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    expect(path.commands).toEqual(sharpEmitReference(rect, identity, params));
  });
});

describe('polygon cornerRadius — scaleParams', () => {
  it('polygon_scaleParams_corner：scale=2 → cornerRadius×2、sides/rotate 不变', () => {
    expect(polygon.scaleParams!({ sides: 6, rotate: 10, cornerRadius: 8 }, 2, 2)).toEqual({
      sides: 6,
      rotate: 10,
      cornerRadius: 16,
    });
    // 几何均值因子：sx=4 sy=1 → factor=2
    expect(polygon.scaleParams!({ sides: 5, cornerRadius: 10 }, 4, 1)).toEqual({
      sides: 5,
      cornerRadius: 20,
    });
  });

  it('polygon_scaleParams_no_corner：无 cornerRadius → 原 params 不变（sides/rotate 不缩）', () => {
    expect(polygon.scaleParams!({ sides: 6, rotate: 10 }, 2, 2)).toEqual({ sides: 6, rotate: 10 });
  });
});

describe('polygon cornerRadius — circumscribe unchanged', () => {
  it('polygon_circumscribe_unchanged：cornerRadius 变化不改 circumscribe AABB', () => {
    const noCorner = polygon.circumscribe(40, 30, { sides: 6 });
    const withCorner = polygon.circumscribe(40, 30, { sides: 6, cornerRadius: 12 });
    expect(withCorner).toEqual(noCorner);
  });
});
