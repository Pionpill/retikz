import type { CenteredBox, Position } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { PathCommand } from '../../src';
import { polygon } from '../../src/providers/shape';

const round2 = (n: number): number => Math.round(n * 100) / 100;

const identity = (n: number): number => n;

/** 轴对齐 rect（emit / boundaryPoint 都接受；boundaryPoint 含 rotate 语义但此处 rotate=0） */
const squareRect = (size = 120): CenteredBox => ({ x: 0, y: 0, width: size, height: size, rotate: 0 });

describe('多边形 cornerRadius — paramsSchema', () => {
  it('aspectRatio 只允许正四边形使用', () => {
    expect(polygon.paramsSchema.parse({ sides: 4, aspectRatio: 1.8 })).toEqual({
      sides: 4,
      aspectRatio: 1.8,
    });
    expect(() => polygon.paramsSchema.parse({ sides: 6, aspectRatio: 1.8 })).toThrow();
    expect(() => polygon.paramsSchema.parse({ sides: 4, rotate: 15, aspectRatio: 1.8 })).toThrow();
  });
});

describe('多边形 cornerRadius — 发射', () => {
  it('六边形圆角输出闭合轮廓，每个顶点连接一段短弧', () => {
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
    const arcs = path.commands.filter((cmd): cmd is Extract<PathCommand, { kind: 'arc' }> => cmd.kind === 'arc');

    for (const arc of arcs) {
      expect(Math.abs(arc.endAngle - arc.startAngle)).toBeLessThanOrEqual(180);
    }
  });
});

describe('多边形 cornerRadius — 边界感知', () => {
  // sides=4 rotate=0：顶点角 0/90/180/270；首顶点在 +x 方向（right）。朝首顶点方向 [1,0] 射线，
  //   r=0 命中尖顶点（外接半径处）；r>0 命中被磨圆的 fillet 弧（离中心更近）。
  it('polygon_boundary_aware：朝顶点方向 r>0 落 fillet 弧（≠ 尖顶点），r=0 = 尖顶点', () => {
    const rect = squareRect();
    const toward: Position = [1000, 0]; // 朝 +x 顶点方向
    const sharp = polygon.computeBoundaryPoint(rect, toward, { sides: 4 });
    const rounded = polygon.computeBoundaryPoint(rect, toward, { sides: 4, cornerRadius: 20 });

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
    const omitted = polygon.computeBoundaryPoint(rect, toward, { sides: 5, rotate: 12 });
    const zero = polygon.computeBoundaryPoint(rect, toward, { sides: 5, rotate: 12, cornerRadius: 0 });

    expect(zero[0]).toBeCloseTo(omitted[0], 9);
    expect(zero[1]).toBeCloseTo(omitted[1], 9);
  });
});

describe('多边形尖角轮廓', () => {
  it('旋转并平移的三角形输出已舍入顶点，零圆角与省略等价', () => {
    const bounds = { ...squareRect(137), x: 7, y: -3 };
    const params = { sides: 3, rotate: 30 };
    const path = [...polygon.emit(bounds, {}, round2, params)][0];
    const zero = [...polygon.emit(bounds, {}, round2, { ...params, cornerRadius: 0 })][0];
    if (path.type !== 'path') throw new Error('expected path');

    // 等边三角形在 30° 朝向时，两端点的 x 跨度等于盒宽，底边到中心为宽度 / (2√3)
    expect(path.commands).toEqual([
      { kind: 'move', to: [75.5, 36.55] },
      { kind: 'line', to: [-61.5, 36.55] },
      { kind: 'line', to: [7, -82.1] },
      { kind: 'close' },
    ]);
    expect(zero).toEqual(path);
  });

  it('未舍入的非对称旋转三角形保留几何精度与闭合命令', () => {
    const prims = [...polygon.emit(squareRect(137), {}, identity, { sides: 3, rotate: 30 })];
    const path = prims[0];
    if (path.type !== 'path') throw new Error('expected path');

    expect(path.commands).toEqual([
      { kind: 'move', to: [expect.closeTo(68.5, 10), expect.closeTo(137 / (2 * Math.sqrt(3)), 10)] },
      { kind: 'line', to: [expect.closeTo(-68.5, 10), expect.closeTo(137 / (2 * Math.sqrt(3)), 10)] },
      { kind: 'line', to: [expect.closeTo(0, 10), expect.closeTo(-137 / Math.sqrt(3), 10)] },
      { kind: 'close' },
    ]);
  });
});

describe('多边形 cornerRadius — scaleParams', () => {
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

describe('多边形 cornerRadius — 外接圆不变', () => {
  it('polygon_circumscribe_unchanged：cornerRadius 变化不改 circumscribe AABB', () => {
    const noCorner = polygon.computeCircumscribedGeometry(40, 30, { sides: 6 });
    const withCorner = polygon.computeCircumscribedGeometry(40, 30, { sides: 6, cornerRadius: 12 });

    expect(withCorner).toEqual(noCorner);
  });
});

describe('多边形菱形 aspectRatio', () => {
  it('aspectRatio=1 保留现有的菱形尺寸', () => {
    expect(polygon.computeCircumscribedGeometry(40, 30, { sides: 4 })).toEqual(
      polygon.computeCircumscribedGeometry(40, 30, { sides: 4, aspectRatio: 1 }),
    );
  });

  it('aspectRatio 控制四面菱形宽高比', () => {
    const result = polygon.computeCircumscribedGeometry(40, 30, { sides: 4, aspectRatio: 1.8 });

    expect(result.halfWidth / result.halfHeight).toBeCloseTo(1.8, 10);
    expect(result.halfWidth).toBeCloseTo(94, 10);
    expect(result.halfHeight).toBeCloseTo(94 / 1.8, 10);
  });

  it('boundaryPoint 和 connectionEnvelope 重复使用相同的各向异性金刚石轮廓', () => {
    const bounds = squareRect(100);
    const params = { sides: 4, aspectRatio: 1.8 } as const;
    const right = polygon.computeBoundaryPoint({ ...bounds, width: 180 }, [1000, 0], params);
    const top = polygon.computeBoundaryPoint(bounds, [0, 1000], params);

    expect(right[0]).toBeCloseTo(90, 10);
    expect(right[1]).toBeCloseTo(0, 10);
    expect(top[0]).toBeCloseTo(0, 10);
    expect(top[1]).toBeCloseTo(50, 10);
    expect(polygon.computeConnectionEnvelope!({ ...bounds, width: 180 }, 'rectangle', params)).toEqual({
      halfWidth: 90,
      halfHeight: 50,
    });
  });
});
