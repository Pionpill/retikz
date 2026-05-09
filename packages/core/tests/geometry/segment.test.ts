import { describe, expect, it } from 'vitest';
import {
  arcSegmentSample,
  circleSegmentSample,
  cubicSegmentSample,
  ellipseSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  quadSegmentSample,
} from '../../src/geometry/segment';

const NEAR = 1e-9;

describe('lineSegmentSample', () => {
  it('t=0 / 0.5 / 1 落在 from / 中点 / to，切线沿 from→to 方向', () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [10, 0];
    expect(lineSegmentSample(a, b, 0).point).toEqual([0, 0]);
    expect(lineSegmentSample(a, b, 0.5).point).toEqual([5, 0]);
    expect(lineSegmentSample(a, b, 1).point).toEqual([10, 0]);
    expect(lineSegmentSample(a, b, 0.5).tangent).toEqual([1, 0]);
  });

  it('退化为零向量时切线兜底为 [1, 0]，不 NaN', () => {
    expect(lineSegmentSample([3, 4], [3, 4], 0.5).tangent).toEqual([1, 0]);
  });
});

describe('quadSegmentSample', () => {
  it('端点（t=0/1）严格通过 from / to', () => {
    const r0 = quadSegmentSample([0, 0], [5, 10], [10, 0], 0);
    const r1 = quadSegmentSample([0, 0], [5, 10], [10, 0], 1);
    expect(r0.point).toEqual([0, 0]);
    expect(r1.point).toEqual([10, 0]);
  });

  it('t=0.5 处对称二次贝塞尔取顶点 (mid_x, control_y/2)', () => {
    const { point } = quadSegmentSample([0, 0], [5, 10], [10, 0], 0.5);
    expect(point[0]).toBeCloseTo(5, 9);
    expect(point[1]).toBeCloseTo(5, 9);
  });

  it('t=0 处切线方向 = (P1 - P0) 归一化', () => {
    const { tangent } = quadSegmentSample([0, 0], [5, 10], [10, 0], 0);
    const len = Math.hypot(5, 10);
    expect(tangent[0]).toBeCloseTo(5 / len, 9);
    expect(tangent[1]).toBeCloseTo(10 / len, 9);
  });
});

describe('cubicSegmentSample', () => {
  it('端点严格通过', () => {
    expect(cubicSegmentSample([0, 0], [3, 9], [7, 9], [10, 0], 0).point).toEqual([0, 0]);
    expect(cubicSegmentSample([0, 0], [3, 9], [7, 9], [10, 0], 1).point).toEqual([10, 0]);
  });

  it('t=0.5 处控制点对称的 cubic 命中预期中点', () => {
    // P(0.5) = 0.125·P0 + 0.375·P1 + 0.375·P2 + 0.125·P3
    const p = cubicSegmentSample([0, 0], [4, 8], [6, 8], [10, 0], 0.5).point;
    expect(p[0]).toBeCloseTo(0.125 * 0 + 0.375 * 4 + 0.375 * 6 + 0.125 * 10, 9);
    expect(p[1]).toBeCloseTo(0.375 * 8 + 0.375 * 8, 9);
  });
});

describe('foldSegmentSample', () => {
  it('t<=0.5 走第一段 (from→corner)；t>0.5 走第二段 (corner→to)', () => {
    const from: [number, number] = [0, 0];
    const corner: [number, number] = [10, 0];
    const to: [number, number] = [10, 5];
    expect(foldSegmentSample(from, corner, to, 0).point).toEqual([0, 0]);
    expect(foldSegmentSample(from, corner, to, 0.25).point).toEqual([5, 0]);
    expect(foldSegmentSample(from, corner, to, 0.5).point).toEqual([10, 0]);
    expect(foldSegmentSample(from, corner, to, 0.75).point).toEqual([10, 2.5]);
    expect(foldSegmentSample(from, corner, to, 1).point).toEqual([10, 5]);
  });

  it('t=0.25 切线沿第一段，t=0.75 沿第二段', () => {
    const from: [number, number] = [0, 0];
    const corner: [number, number] = [10, 0];
    const to: [number, number] = [10, 5];
    expect(foldSegmentSample(from, corner, to, 0.25).tangent).toEqual([1, 0]);
    expect(foldSegmentSample(from, corner, to, 0.75).tangent).toEqual([0, 1]);
  });
});

describe('arcSegmentSample', () => {
  it('t=0/1 落在 startAngle / endAngle 对应的圆周点', () => {
    const center: [number, number] = [0, 0];
    const r0 = arcSegmentSample(center, 10, 0, 90, 0);
    const r1 = arcSegmentSample(center, 10, 0, 90, 1);
    expect(r0.point[0]).toBeCloseTo(10, 9);
    expect(r0.point[1]).toBeCloseTo(0, 9);
    expect(r1.point[0]).toBeCloseTo(0, 9);
    expect(r1.point[1]).toBeCloseTo(10, 9);
  });

  it('t=0.5 处取扫过区间的中点角', () => {
    const { point } = arcSegmentSample([0, 0], 10, 0, 90, 0.5);
    expect(point[0]).toBeCloseTo(Math.cos(Math.PI / 4) * 10, 9);
    expect(point[1]).toBeCloseTo(Math.sin(Math.PI / 4) * 10, 9);
  });

  it('endAngle < startAngle 时切线扫描方向反向', () => {
    // 0° → -90°（视觉逆时针：从 east 扫到 north）
    const t = arcSegmentSample([0, 0], 10, 0, -90, 0).tangent;
    // angle=0：(-sin(0), cos(0)) = (0, 1)；sweep 反向后变 (0, -1)
    expect(t[0]).toBeCloseTo(0, 9);
    expect(t[1]).toBeCloseTo(-1, 9);
  });
});

describe('circleSegmentSample', () => {
  it('t=0 / 0.25 / 0.5 / 0.75 落在 east / south / west / north', () => {
    const c: [number, number] = [0, 0];
    expect(circleSegmentSample(c, 10, 0).point[0]).toBeCloseTo(10, 9);
    expect(circleSegmentSample(c, 10, 0).point[1]).toBeCloseTo(0, 9);

    expect(circleSegmentSample(c, 10, 0.25).point[0]).toBeCloseTo(0, 9);
    expect(circleSegmentSample(c, 10, 0.25).point[1]).toBeCloseTo(10, 9);

    expect(circleSegmentSample(c, 10, 0.5).point[0]).toBeCloseTo(-10, 9);
    expect(circleSegmentSample(c, 10, 0.5).point[1]).toBeCloseTo(0, 9);

    expect(circleSegmentSample(c, 10, 0.75).point[0]).toBeCloseTo(0, 9);
    expect(circleSegmentSample(c, 10, 0.75).point[1]).toBeCloseTo(-10, 9);
  });
});

describe('ellipseSegmentSample', () => {
  it('rx=ry 时退化为圆', () => {
    const a = ellipseSegmentSample([0, 0], 10, 10, 0.25);
    const b = circleSegmentSample([0, 0], 10, 0.25);
    expect(a.point[0]).toBeCloseTo(b.point[0], 9);
    expect(a.point[1]).toBeCloseTo(b.point[1], 9);
  });

  it('t=0 落在 (rx, 0)；t=0.25 落在 (0, ry)', () => {
    const r0 = ellipseSegmentSample([0, 0], 8, 5, 0);
    expect(r0.point[0]).toBeCloseTo(8, 9);
    expect(r0.point[1]).toBeCloseTo(0, 9);
    const r1 = ellipseSegmentSample([0, 0], 8, 5, 0.25);
    expect(r1.point[0]).toBeCloseTo(0, 9);
    expect(r1.point[1]).toBeCloseTo(5, 9);
  });

  it('切线为单位向量', () => {
    const { tangent } = ellipseSegmentSample([0, 0], 8, 5, 0.1);
    expect(Math.hypot(tangent[0], tangent[1])).toBeCloseTo(1, 9);
    void NEAR; // silence unused warning
  });
});
