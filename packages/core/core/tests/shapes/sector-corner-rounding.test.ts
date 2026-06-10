/**
 * sector cornerRadius（ADR-07 统一圆角）—— params + emit fillet 弧 + boundary 感知 + r=0 等价 + scaleParams
 * @description sector 轮廓是「直边 + 圆弧」混合（环楔 = radial Line + outerArc + radial Line + innerArc，
 *   pie = radial Line + outerArc + radial Line 交于 apex），接缝是 line-arc / arc-line / line-line。
 *   rayOrigin 是质心（不是圆心），r=0 时 boundaryPoint 必须与现状 sectorBoundaryHit（质心射线 ∩ 轮廓）数值等价。
 *   覆盖：
 *   - paramsSchema：cornerRadius 可选 nonnegative finite，负值 / 非有限 reject；
 *   - r=0 emit 等价：省略 cornerRadius → emit 命令序同现状（含 inner/outer arc + radial line + close）；
 *   - r=0 boundary 等价（硬回归）：质心射线多方向命中 = 现状 sectorBoundaryHit 数值；
 *   - emit fillet：环楔 / pie r>0 → 接缝处含 fillet 弧；
 *   - boundary-aware：朝某接缝方向 r>0 落 fillet 弧（≠ 尖角）；
 *   - 窄角夹紧：窄张角 + 大 cornerRadius 仍产合法闭合轮廓、不自交；
 *   - circumscribe 不随 cornerRadius 变；scaleParams 缩 cornerRadius。
 */
import { describe, expect, it } from 'vitest';
import { sector } from '../../src/shapes';
import type { Rect } from '../../src/shapes';
import type { Position } from '../../src/geometry/point';
import { localToWorld, worldToLocal } from '../../src/geometry/transform';
import { sectorGeometry, sectorPolarPoint } from '../../src/shapes/shared';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const identity = (n: number): number => n;

type SectorParams = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius?: number;
};

/** rect helper（emit / boundaryPoint 都接受；可带 rotate） */
const mkRect = (x = 0, y = 0, w = 120, h = 120, rotate = 0): Rect => ({ x, y, width: w, height: h, rotate });

// ───────────────────────────── 现状参考实现（用于 r=0 数值回归对照）─────────────────────────────

/**
 * 现状 sectorBoundaryHit 的独立复刻：从质心向 toward 射线，求与外弧 / 内弧 / 两径向边轮廓的最近正交点。
 * 与改前 sector.ts 内 sectorBoundaryHit 逐字同算法（局部圆心系）。
 */
const referenceBoundaryHit = (rect: Rect, params: SectorParams, toward: Position): Position | undefined => {
  const geo = sectorGeometry(params);
  const origin = localToWorld(rect, geo.boundaryOriginOffset);
  const worldToLocalFromApex = (w: Position): Position => {
    const fromCenter = worldToLocal(rect, w);
    return [fromCenter[0] - geo.apexOffset[0], fromCenter[1] - geo.apexOffset[1]];
  };
  const localFromApexToWorld = (p: Position): Position =>
    localToWorld(rect, [p[0] + geo.apexOffset[0], p[1] + geo.apexOffset[1]]);

  const o = worldToLocalFromApex(origin);
  const t = worldToLocalFromApex(toward);
  const dir: Position = [t[0] - o[0], t[1] - o[1]];
  const dl = Math.hypot(dir[0], dir[1]);
  if (dl < 1e-12) return undefined;
  const ux = dir[0] / dl;
  const uy = dir[1] / dl;
  const { innerRadius, outerRadius } = params;
  const { start, end } = geo.range;

  let best = Infinity;
  const rayCircle = (R: number): Array<number> => {
    const b = 2 * (o[0] * ux + o[1] * uy);
    const c = o[0] * o[0] + o[1] * o[1] - R * R;
    const disc = b * b - 4 * c;
    if (disc < 0) return [];
    const sq = Math.sqrt(disc);
    return [(-b - sq) / 2, (-b + sq) / 2];
  };
  const angleInRange = (px: number, py: number): boolean => {
    const a0 = (Math.atan2(py, px) * 180) / Math.PI;
    const a = a0 + 360 * Math.max(0, Math.ceil((start - a0) / 360));
    return a <= end + 1e-9;
  };
  for (const R of innerRadius > 0 ? [innerRadius, outerRadius] : [outerRadius]) {
    for (const s of rayCircle(R)) {
      if (s <= 1e-9 || s >= best) continue;
      const px = o[0] + s * ux;
      const py = o[1] + s * uy;
      if (angleInRange(px, py)) best = s;
    }
  }
  for (const ang of [start, end]) {
    const rad = (ang * Math.PI) / 180;
    const ex = Math.cos(rad);
    const ey = Math.sin(rad);
    const det = ux * -ey - -ex * uy;
    if (Math.abs(det) < 1e-12) continue;
    const s = (-o[0] * -ey - -ex * -o[1]) / det;
    const q = (ux * -o[1] - -o[0] * uy) / det;
    if (s <= 1e-9 || s >= best) continue;
    if (q >= innerRadius - 1e-9 && q <= outerRadius + 1e-9) best = s;
  }
  if (!Number.isFinite(best)) return undefined;
  const localHit: Position = [o[0] + best * ux, o[1] + best * uy];
  return localFromApexToWorld(localHit);
};

// ───────────────────────────── paramsSchema ─────────────────────────────

describe('sector cornerRadius — paramsSchema', () => {
  const base = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
  it('cornerRadius optional + nonnegative finite', () => {
    expect(sector.paramsSchema.parse(base)).toEqual(base);
    expect(sector.paramsSchema.parse({ ...base, cornerRadius: 5 })).toEqual({ ...base, cornerRadius: 5 });
    expect(sector.paramsSchema.parse({ ...base, cornerRadius: 0 })).toEqual({ ...base, cornerRadius: 0 });
  });

  it('negative_cornerRadius_rejected', () => {
    expect(() => sector.paramsSchema.parse({ ...base, cornerRadius: -1 })).toThrow();
  });

  it('non_finite_cornerRadius_rejected', () => {
    expect(() => sector.paramsSchema.parse({ ...base, cornerRadius: Infinity })).toThrow();
    expect(() => sector.paramsSchema.parse({ ...base, cornerRadius: NaN })).toThrow();
  });
});

// ───────────────────────────── r=0 emit 等价 ─────────────────────────────

describe('sector cornerRadius — r=0 emit equivalence', () => {
  /** 现状 emit 命令序参考（环楔 / pie）—— 与改前 sector.ts emit 逐字同。 */
  const sharpEmitReference = (rect: Rect, round: (n: number) => number, params: SectorParams) => {
    const geo = sectorGeometry(params);
    const { innerRadius, outerRadius } = params;
    const { start, end } = geo.range;
    const toWorld = (localFromApex: Position): Position =>
      localToWorld(rect, [localFromApex[0] + geo.apexOffset[0], localFromApex[1] + geo.apexOffset[1]]);
    const apex = toWorld([0, 0]);
    const outerStart = toWorld(sectorPolarPoint(outerRadius, start));
    const rp = (p: Position): [number, number] => [round(p[0]), round(p[1])];
    const commands: Array<Record<string, unknown>> = [];
    if (innerRadius > 0) {
      const innerStart = toWorld(sectorPolarPoint(innerRadius, start));
      const innerEnd = toWorld(sectorPolarPoint(innerRadius, end));
      commands.push({ kind: 'move', to: rp(innerStart) });
      commands.push({ kind: 'line', to: rp(outerStart) });
      commands.push({ kind: 'arc', center: rp(apex), radius: round(outerRadius), startAngle: start, endAngle: end });
      commands.push({ kind: 'line', to: rp(innerEnd) });
      commands.push({
        kind: 'arc',
        center: rp(apex),
        radius: round(innerRadius),
        startAngle: end,
        endAngle: start,
        counterClockwise: true,
      });
      commands.push({ kind: 'close' });
    } else {
      commands.push({ kind: 'move', to: rp(apex) });
      commands.push({ kind: 'line', to: rp(outerStart) });
      commands.push({ kind: 'arc', center: rp(apex), radius: round(outerRadius), startAngle: start, endAngle: end });
      commands.push({ kind: 'close' });
    }
    return commands;
  };

  /**
   * 比较 emit 命令序与现状参考：命令 kind 序逐字相等；line/move 落点逐字相等；arc 圆心 / 半径逐字、
   * 起止角数值接近（容差 1e-6）。
   * @description passthrough（r 省略）下 rounded-contour 的 emitSegmentBody 由弧端点 atan2 重建起止角，
   *   与现状直接写字面 start/end 几何等价但浮点上有 ~1e-13 抖动（如 200 → 199.999…），且 CW 弧带 counterClockwise:undefined。
   *   故 arc 角度用 closeTo、其余逐字。
   */
  /** 两角（度）mod 360 等价断言（差为 360 的整数倍即视为同角） */
  const expectAngleEquiv = (a: number, b: number): void => {
    let diff = (a - b) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    expect(diff).toBeCloseTo(0, 6);
  };

  const expectEmitMatchesReference = (
    got: Array<{ kind: string; to?: [number, number]; center?: [number, number]; radius?: number; startAngle?: number; endAngle?: number }>,
    ref: Array<Record<string, unknown>>,
  ): void => {
    expect(got.map(c => c.kind)).toEqual(ref.map(c => c.kind));
    got.forEach((c, i) => {
      const r = ref[i];
      if (c.kind === 'move' || c.kind === 'line') {
        expect(c.to).toEqual(r.to);
      } else if (c.kind === 'arc') {
        expect(c.center).toEqual(r.center);
        expect(c.radius).toBe(r.radius);
        // 角度 mod 360 等价即可（CCW 重建可能取 −160 表示 200，差 360°）
        expectAngleEquiv(c.startAngle!, r.startAngle as number);
        expectAngleEquiv(c.endAngle!, r.endAngle as number);
      }
    });
  };

  it('sector_r0_emit_equiv：环楔省略 cornerRadius emit 命令序 = 现状（含 inner/outer arc + radial line + close）', () => {
    const rect = mkRect(30, 30, 60, 60);
    const cases: Array<SectorParams> = [
      { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 },
      { innerRadius: 10, outerRadius: 50, startAngle: 30, endAngle: 200 },
      { innerRadius: 15, outerRadius: 40, startAngle: -45, endAngle: 45 },
    ];
    for (const params of cases) {
      const prims = [...sector.emit(rect, {}, identity, params)];
      const path = prims[0];
      if (path.type !== 'path') throw new Error('expected path');
      expectEmitMatchesReference(path.commands, sharpEmitReference(rect, identity, params));
    }
  });

  it('sector_r0_emit_equiv_pie：pie（innerRadius=0）省略 cornerRadius emit 命令序 = 现状（apex→outer→arc→close）', () => {
    const rect = mkRect(30, 0, 60, 60);
    const params: SectorParams = { innerRadius: 0, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const prims = [...sector.emit(rect, {}, identity, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    expectEmitMatchesReference(path.commands, sharpEmitReference(rect, identity, params));
  });
});

// ───────────────────────────── r=0 boundary 等价（硬回归）─────────────────────────────

describe('sector cornerRadius — r=0 boundary equivalence (centroid ray, hard regression)', () => {
  it('sector_r0_boundary_centroid：环楔多方向 boundaryPoint = 现状 sectorBoundaryHit 数值（质心射线）', () => {
    const rect = mkRect(30, 30, 60, 60);
    const params: SectorParams = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const towards: Array<Position> = [
      [1000, 500],
      [500, 1000],
      [-1000, 1000],
      [1000, -50],
      [42, 42],
      [-500, 200],
    ];
    for (const toward of towards) {
      const got = sector.boundaryPoint(rect, toward, params);
      const ref = referenceBoundaryHit(rect, params, toward);
      expect(ref).toBeDefined();
      expect(got[0]).toBeCloseTo(ref![0], 6);
      expect(got[1]).toBeCloseTo(ref![1], 6);
    }
  });

  it('sector_r0_boundary_centroid_pie：pie 多方向 boundaryPoint = 现状 sectorBoundaryHit 数值', () => {
    const rect = mkRect(30, 0, 60, 60);
    const params: SectorParams = { innerRadius: 0, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const towards: Array<Position> = [
      [1000, 500],
      [500, 1000],
      [1000, 10],
      [10, 1000],
      [-200, 100],
    ];
    for (const toward of towards) {
      const got = sector.boundaryPoint(rect, toward, params);
      const ref = referenceBoundaryHit(rect, params, toward);
      expect(ref).toBeDefined();
      expect(got[0]).toBeCloseTo(ref![0], 6);
      expect(got[1]).toBeCloseTo(ref![1], 6);
    }
  });

  it('sector_r0_boundary_centroid_rotated：带 rotate 的 rect 下仍逐方向数值等价', () => {
    const rect = mkRect(40, 25, 80, 70, 27);
    const params: SectorParams = { innerRadius: 18, outerRadius: 55, startAngle: 20, endAngle: 160 };
    const towards: Array<Position> = [
      [200, 200],
      [-100, 300],
      [300, -50],
      [50, 400],
    ];
    for (const toward of towards) {
      const got = sector.boundaryPoint(rect, toward, params);
      const ref = referenceBoundaryHit(rect, params, toward);
      expect(ref).toBeDefined();
      expect(got[0]).toBeCloseTo(ref![0], 6);
      expect(got[1]).toBeCloseTo(ref![1], 6);
    }
  });
});

// ───────────────────────────── emit fillet（r>0）─────────────────────────────

describe('sector cornerRadius — emit fillet arcs', () => {
  it('sector_cornerRadius_emit：环楔 r>0 → emit 在接缝处含 fillet 弧（arc 命令数 > 现状 2）', () => {
    const rect = mkRect(30, 30, 60, 60);
    const params: SectorParams = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90, cornerRadius: 6 };
    const prims = [...sector.emit(rect, {}, round2, params)];
    expect(prims.length).toBe(1);
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    const kinds = path.commands.map(c => c.kind);
    expect(kinds[0]).toBe('move');
    expect(kinds[kinds.length - 1]).toBe('close');
    // 现状环楔仅 2 段 arc（内外弧）；倒角后 4 个 line-arc/arc-line 接缝各插 1 fillet 弧 → arc 数 > 2
    expect(kinds.filter(k => k === 'arc').length).toBeGreaterThan(2);
  });

  it('sector_pie_apex_rounded：pie（innerRadius=0）+ cornerRadius>0 → apex 处倒角（含 fillet 弧）', () => {
    const rect = mkRect(30, 0, 60, 60);
    const params: SectorParams = { innerRadius: 0, outerRadius: 60, startAngle: 0, endAngle: 90, cornerRadius: 6 };
    const prims = [...sector.emit(rect, {}, round2, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    const kinds = path.commands.map(c => c.kind);
    // 现状 pie 仅 1 段 arc（外弧）；倒角后 3 接缝（含 apex line-line）各插 fillet 弧 → arc 数 > 1
    expect(kinds.filter(k => k === 'arc').length).toBeGreaterThan(1);
  });
});

// ───────────────────────────── boundary-aware（r>0）─────────────────────────────

describe('sector cornerRadius — boundary aware', () => {
  it('sector_boundary_aware_corner：朝外弧/径向边接缝方向 r>0 落 fillet 弧（边界 ≠ r=0 尖角）', () => {
    const rect = mkRect(30, 30, 60, 60);
    const params0: SectorParams = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const paramsR: SectorParams = { ...params0, cornerRadius: 8 };
    // 朝外径向边（startAngle=0）与外弧相交的接缝角（outerStart 世界坐标 (60,0)），质心在 ~45° 方向。
    //   该接缝被磨圆 → 朝它方向的边界点应明显内移（≠ 尖角点）。
    const toward: Position = [60, 0];
    const sharp = sector.boundaryPoint(rect, toward, params0);
    const rounded = sector.boundaryPoint(rect, toward, paramsR);
    const moved = Math.hypot(rounded[0] - sharp[0], rounded[1] - sharp[1]);
    expect(moved).toBeGreaterThan(1e-3);
  });

  it('sector_boundary_r0_eq_sharp：cornerRadius:0 boundary = 省略 cornerRadius', () => {
    const rect = mkRect(30, 30, 60, 60);
    const toward: Position = [300, 130];
    const params: SectorParams = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const omitted = sector.boundaryPoint(rect, toward, params);
    const zero = sector.boundaryPoint(rect, toward, { ...params, cornerRadius: 0 });
    expect(zero[0]).toBeCloseTo(omitted[0], 9);
    expect(zero[1]).toBeCloseTo(omitted[1], 9);
  });
});

// ───────────────────────────── 窄角夹紧 ─────────────────────────────

describe('sector cornerRadius — clamp narrow', () => {
  it('sector_clamp_narrow：窄张角 + 大 cornerRadius → 合法闭合轮廓、命令有限', () => {
    const rect = mkRect(30, 30, 60, 60);
    const params: SectorParams = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 8, cornerRadius: 50 };
    const prims = [...sector.emit(rect, {}, round2, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    expect(path.commands[path.commands.length - 1].kind).toBe('close');
    for (const c of path.commands) {
      if (c.kind === 'move' || c.kind === 'line') {
        expect(Number.isFinite(c.to[0])).toBe(true);
        expect(Number.isFinite(c.to[1])).toBe(true);
      }
      if (c.kind === 'arc') {
        expect(Number.isFinite(c.center[0])).toBe(true);
        expect(Number.isFinite(c.center[1])).toBe(true);
        expect(Number.isFinite(c.radius)).toBe(true);
      }
    }
  });
});

// ───────────────────────────── circumscribe / scaleParams ─────────────────────────────

describe('sector cornerRadius — circumscribe unchanged / scaleParams', () => {
  it('sector_circumscribe_unchanged：cornerRadius 变化不改 circumscribe AABB', () => {
    const base = { innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 };
    const noCorner = sector.circumscribe(0, 0, base);
    const withCorner = sector.circumscribe(0, 0, { ...base, cornerRadius: 10 });
    expect(withCorner).toEqual(noCorner);
  });

  it('sector_scaleParams_corner：scale=2 → 半径×2、cornerRadius×2、角度不变', () => {
    const scaled = sector.scaleParams!(
      { innerRadius: 20, outerRadius: 60, startAngle: 45, endAngle: 135, cornerRadius: 5 },
      2,
      2,
    );
    expect(scaled).toEqual({ innerRadius: 40, outerRadius: 120, startAngle: 45, endAngle: 135, cornerRadius: 10 });
    // 几何均值因子：sx=4 sy=1 → factor=2
    const aniso = sector.scaleParams!(
      { innerRadius: 10, outerRadius: 30, startAngle: 0, endAngle: 90, cornerRadius: 4 },
      4,
      1,
    );
    expect(aniso.cornerRadius).toBeCloseTo(8, 9);
  });

  it('sector_scaleParams_no_corner：无 cornerRadius → 不引入该字段', () => {
    const scaled = sector.scaleParams!({ innerRadius: 20, outerRadius: 60, startAngle: 0, endAngle: 90 }, 2, 2);
    expect(scaled).toEqual({ innerRadius: 40, outerRadius: 120, startAngle: 0, endAngle: 90 });
    expect('cornerRadius' in scaled).toBe(false);
  });
});
