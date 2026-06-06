/**
 * star cornerRadius（统一圆角）—— params + emit fillet 弧（含凹角 notch）+ boundary 感知 + r=0 等价 + scaleParams
 * @description 覆盖：
 *   - paramsSchema：cornerRadius 可选 nonnegative finite，负值 / 非有限 reject；
 *   - emit：cornerRadius>0 path 含 fillet arc 命令（凸尖 + 凹角各一段）；
 *   - 凹角专测（notch）：notch 处 fillet arc 的 sweep 方向与相邻 tip 相反；boundaryPoint 朝 notch 方向落
 *     fillet 弧上（≠ 凹角顶点）；circumscribe 不随 cornerRadius 变；
 *   - boundary-aware：朝 tip 方向 r>0 落 fillet 弧上（≠ 尖角顶点）；r=0 = 尖角顶点；
 *   - r=0 等价：省略 cornerRadius → emit / boundaryPoint 逐字段同现状（直接对照原始尖角轮廓数学）；
 *   - scaleParams：scale=2 → cornerRadius×2、inner/outerRadius×2、points/rotate 不变。
 *
 *   角度约定（SVG y-down）：顶点 k 角 = (rotate ?? 0) + k·(180/points) − 90，偶 k 取 outerRadius（尖角 tip）、
 *   奇 k 取 innerRadius（凹角 notch）；0°=+x、90°=+y(屏幕下)、−90 基准使默认第一尖角朝上（−y）。
 */
import { describe, expect, it } from 'vitest';
import { star } from '../../src/shapes';
import type { Rect } from '../../src/shapes';
import type { Position } from '../../src/geometry/point';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const identity = (n: number): number => n;

/** 以星形几何中心为原点的对称 rect（emit 收轴对齐 rect；boundaryPoint 含 rotate 语义此处 rotate=0） */
const starRect = (params: { points: number; innerRadius: number; outerRadius: number; rotate?: number }): Rect => {
  const { halfWidth, halfHeight } = star.circumscribe(0, 0, params);
  return { x: 0, y: 0, width: 2 * halfWidth, height: 2 * halfHeight, rotate: 0 };
};

describe('star cornerRadius — paramsSchema', () => {
  const base = { points: 5, innerRadius: 16, outerRadius: 40 };

  it('cornerRadius optional + nonnegative finite', () => {
    expect(star.paramsSchema.parse(base)).toEqual(base);
    expect(star.paramsSchema.parse({ ...base, cornerRadius: 6 })).toEqual({ ...base, cornerRadius: 6 });
    expect(star.paramsSchema.parse({ ...base, cornerRadius: 0 })).toEqual({ ...base, cornerRadius: 0 });
  });

  it('negative_cornerRadius_rejected', () => {
    expect(() => star.paramsSchema.parse({ ...base, cornerRadius: -1 })).toThrow();
  });

  it('non_finite_cornerRadius_rejected', () => {
    expect(() => star.paramsSchema.parse({ ...base, cornerRadius: Infinity })).toThrow();
    expect(() => star.paramsSchema.parse({ ...base, cornerRadius: NaN })).toThrow();
  });
});

describe('star cornerRadius — emit', () => {
  it('star_cornerRadius_emit：points:5 cornerRadius:6 → path 含 fillet arc 命令', () => {
    const params = { points: 5, innerRadius: 16, outerRadius: 40, cornerRadius: 6 };
    const rect = starRect(params);
    const prims = [...star.emit(rect, {}, round2, params)];
    expect(prims.length).toBe(1);
    const path = prims[0];
    expect(path.type).toBe('path');
    if (path.type !== 'path') throw new Error('expected path');
    const kinds = path.commands.map(c => c.kind);
    expect(kinds[0]).toBe('move');
    expect(kinds[kinds.length - 1]).toBe('close');
    // 2×points = 10 顶点（5 尖 + 5 凹）各一段 fillet 弧；10 条缩短直线
    expect(kinds.filter(k => k === 'arc').length).toBe(10);
    expect(kinds.filter(k => k === 'line').length).toBe(10);
  });
});

describe('star cornerRadius — notch (凹角专测)', () => {
  const params = { points: 5, innerRadius: 16, outerRadius: 40, cornerRadius: 6 };

  it('star_notch_fillet：notch 处 fillet arc sweep 方向与相邻 tip 相反', () => {
    const rect = starRect(params);
    const prims = [...star.emit(rect, {}, identity, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    const arcs = path.commands.filter((c): c is Extract<typeof c, { kind: 'arc' }> => c.kind === 'arc');
    expect(arcs.length).toBe(10);
    // 顶点环偶=尖角（凸）、奇=凹角（notch）；每个接缝一段 fillet 弧。轮廓闭合后接缝下标 i = 段 i 终点处的顶点 i+1。
    //   凸尖与凹角交替 → fillet 弧的 sweep（counterClockwise）必在两类间交替。
    const sweeps = arcs.map(a => a.counterClockwise ?? false);
    // 相邻 fillet 弧 sweep 交替（凸 / 凹反向），即每对相邻弧 sweep 不同
    for (let i = 0; i < sweeps.length; i++) {
      expect(sweeps[i]).not.toBe(sweeps[(i + 1) % sweeps.length]);
    }
    // 两类各 5 段
    expect(sweeps.filter(s => s).length).toBe(5);
    expect(sweeps.filter(s => !s).length).toBe(5);
  });

  it('star_notch_boundary：朝 notch 方向 r>0 落 fillet 弧上（≠ 凹角顶点），r=0 = 凹角顶点', () => {
    const sharpParams = { points: 5, innerRadius: 16, outerRadius: 40 };
    const rect = starRect(sharpParams);
    // notch-0 = 顶点 1（凹角）方向；朝该方向发射线
    const notch0 = star.anchor(rect, 'notch-0', sharpParams)!;
    const dir = Math.hypot(notch0[0], notch0[1]);
    const toward: Position = [notch0[0] / dir * 1000, notch0[1] / dir * 1000];
    const sharp = star.boundaryPoint(rect, toward, sharpParams);
    const rounded = star.boundaryPoint(rect, toward, { ...sharpParams, cornerRadius: 6 });
    // r=0 命中凹角顶点（innerRadius 处）
    expect(Math.hypot(sharp[0], sharp[1])).toBeCloseTo(16, 4);
    // r>0：凹角被磨圆，凹槽朝外鼓 → 朝凹角方向边界比凹角顶点更远离中心（fillet 弧朝外侧）
    const distSharp = Math.hypot(sharp[0], sharp[1]);
    const distRounded = Math.hypot(rounded[0], rounded[1]);
    expect(distRounded).not.toBeCloseTo(distSharp, 3);
    expect(distRounded).toBeGreaterThan(distSharp + 1e-6);
  });

  it('star_notch_circumscribe_unchanged：cornerRadius 不改 circumscribe AABB', () => {
    const noCorner = star.circumscribe(0, 0, { points: 5, innerRadius: 16, outerRadius: 40 });
    const withCorner = star.circumscribe(0, 0, { points: 5, innerRadius: 16, outerRadius: 40, cornerRadius: 6 });
    expect(withCorner).toEqual(noCorner);
  });
});

describe('star cornerRadius — boundary aware (tip)', () => {
  it('star_boundary_aware：朝 tip 方向 r>0 落 fillet 弧（≠ 尖角顶点），r=0 = 尖角顶点', () => {
    const sharpParams = { points: 5, innerRadius: 16, outerRadius: 40 };
    const rect = starRect(sharpParams);
    // tip-0 = 顶点 0（尖角）朝上 (0,−40)；朝该方向发射线
    const toward: Position = [0, -1000];
    const sharp = star.boundaryPoint(rect, toward, sharpParams);
    const rounded = star.boundaryPoint(rect, toward, { ...sharpParams, cornerRadius: 6 });
    // r=0 命中尖角顶点（outerRadius 处）
    expect(Math.hypot(sharp[0], sharp[1])).toBeCloseTo(40, 4);
    // 尖角被磨圆 → 朝尖角方向边界更靠近中心
    expect(Math.hypot(rounded[0], rounded[1])).toBeLessThan(Math.hypot(sharp[0], sharp[1]) - 1e-6);
  });
});

describe('star cornerRadius — r=0 equivalence to current sharp-corner output', () => {
  // 现状参考实现：emit = move(v0) + line(v1..v_{2n-1}) + close（顶点过 round），无回起点冗余 line。
  const sharpEmitReference = (
    rect: Rect,
    round: (n: number) => number,
    params: { points: number; innerRadius: number; outerRadius: number; rotate?: number },
  ): Array<{ kind: string; to?: [number, number] }> => {
    const DEG = Math.PI / 180;
    const rotate = params.rotate ?? 0;
    const step = 180 / params.points;
    const out: Array<{ kind: string; to?: [number, number] }> = [];
    for (let k = 0; k < 2 * params.points; k++) {
      const angle = (rotate + k * step - 90) * DEG;
      const radius = k % 2 === 0 ? params.outerRadius : params.innerRadius;
      // 局部点 + rect 中心平移（rotate=0 时 localToWorld = 平移）
      const v: [number, number] = [
        round(rect.x + radius * Math.cos(angle)),
        round(rect.y + radius * Math.sin(angle)),
      ];
      out.push({ kind: k === 0 ? 'move' : 'line', to: v });
    }
    out.push({ kind: 'close' });
    return out;
  };

  it('star_r0_equiv_emit：省略 cornerRadius emit 逐字段同现状尖角输出', () => {
    const cases: Array<{ points: number; innerRadius: number; outerRadius: number; rotate?: number }> = [
      { points: 3, innerRadius: 10, outerRadius: 30 },
      { points: 5, innerRadius: 16, outerRadius: 40 },
      { points: 6, innerRadius: 20, outerRadius: 50, rotate: 17 },
      { points: 8, innerRadius: 12, outerRadius: 44, rotate: -30 },
    ];
    for (const params of cases) {
      const rect = starRect(params);
      const prims = [...star.emit(rect, {}, round2, params)];
      const path = prims[0];
      if (path.type !== 'path') throw new Error('expected path');
      expect(path.commands).toEqual(sharpEmitReference(rect, round2, params));
    }
  });

  it('star_r0_equiv_emit_unrounded：identity round 下顶点逐字等价（无 round 时机差异）', () => {
    const params = { points: 7, innerRadius: 18, outerRadius: 47, rotate: 23 };
    const rect = starRect(params);
    const prims = [...star.emit(rect, {}, identity, params)];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');
    expect(path.commands).toEqual(sharpEmitReference(rect, identity, params));
  });

  it('star_r0_equiv_boundary：省略 cornerRadius / cornerRadius:0 boundaryPoint 逐字段同现状', () => {
    const params = { points: 5, innerRadius: 16, outerRadius: 40, rotate: 12 };
    const rect = starRect(params);
    const towards: Array<Position> = [
      [300, 130],
      [-200, 90],
      [0, -500],
      [120, -40],
    ];
    for (const toward of towards) {
      const omitted = star.boundaryPoint(rect, toward, params);
      const zero = star.boundaryPoint(rect, toward, { ...params, cornerRadius: 0 });
      expect(zero[0]).toBeCloseTo(omitted[0], 9);
      expect(zero[1]).toBeCloseTo(omitted[1], 9);
    }
  });
});

describe('star cornerRadius — scaleParams', () => {
  it('star_scaleParams_corner：scale=2 → cornerRadius×2、inner/outerRadius×2、points/rotate 不变', () => {
    expect(
      star.scaleParams!({ points: 5, innerRadius: 16, outerRadius: 40, rotate: 10, cornerRadius: 6 }, 2, 2),
    ).toEqual({
      points: 5,
      innerRadius: 32,
      outerRadius: 80,
      rotate: 10,
      cornerRadius: 12,
    });
    // 几何均值因子：sx=4 sy=1 → factor=2
    expect(
      star.scaleParams!({ points: 5, innerRadius: 16, outerRadius: 40, cornerRadius: 6 }, 4, 1),
    ).toEqual({
      points: 5,
      innerRadius: 32,
      outerRadius: 80,
      cornerRadius: 12,
    });
  });

  it('star_scaleParams_no_corner：无 cornerRadius → 不引入 cornerRadius 字段（inner/outerRadius 仍缩）', () => {
    expect(star.scaleParams!({ points: 5, innerRadius: 16, outerRadius: 40, rotate: 10 }, 2, 2)).toEqual({
      points: 5,
      innerRadius: 32,
      outerRadius: 80,
      rotate: 10,
    });
  });
});
