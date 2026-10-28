import { lerp } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { Anchor, Side } from '../../../src/shared';
import { EDGE_ENDS, edgeAngleDeg } from '../../../src/shared/geometry/edge';
import { ellipse } from '../../../src/shared/geometry/ellipse';
import { rect } from '../../../src/shared/geometry/rect';

const near = (p: readonly [number, number], x: number, y: number, d = 6): void => {
  expect(p[0]).toBeCloseTo(x, d);
  expect(p[1]).toBeCloseTo(y, d);
};

describe('edge 共享方向约定', () => {
  it('EDGE_ENDS：top/bottom 西→东，right/left 北→南', () => {
    expect(EDGE_ENDS[Side.Top]).toEqual([Anchor.TopLeft, Anchor.TopRight]);
    expect(EDGE_ENDS[Side.Bottom]).toEqual([Anchor.BottomLeft, Anchor.BottomRight]);
    expect(EDGE_ENDS[Side.Right]).toEqual([Anchor.TopRight, Anchor.BottomRight]);
    expect(EDGE_ENDS[Side.Left]).toEqual([Anchor.TopLeft, Anchor.BottomLeft]);
  });

  it('edgeAngleDeg：四 side 的 θ(t) 与角度表一致', () => {
    expect(edgeAngleDeg(Side.Top, 0)).toBeCloseTo(225, 6);
    expect(edgeAngleDeg(Side.Top, 0.5)).toBeCloseTo(270, 6);
    expect(edgeAngleDeg(Side.Top, 1)).toBeCloseTo(315, 6);
    expect(edgeAngleDeg(Side.Bottom, 0)).toBeCloseTo(135, 6);
    expect(edgeAngleDeg(Side.Bottom, 1)).toBeCloseTo(45, 6);
    expect(edgeAngleDeg(Side.Right, 0)).toBeCloseTo(-45, 6);
    expect(edgeAngleDeg(Side.Right, 1)).toBeCloseTo(45, 6);
    expect(edgeAngleDeg(Side.Left, 0)).toBeCloseTo(225, 6);
    expect(edgeAngleDeg(Side.Left, 1)).toBeCloseTo(135, 6);
  });

  it('lerp：线性插值', () => {
    near(lerp([0, 0], [10, 20], 0.5), 5, 10);
    near(lerp([0, 0], [10, 20], 0), 0, 0);
    near(lerp([0, 0], [10, 20], 1), 10, 20);
  });
});

describe('rect.edgePoint：矩形四直边', () => {
  // w=20,h=10 → halfW=10, halfH=5；anchors NW(-10,-5) NE(10,-5) SW(-10,5) SE(10,5)
  const r = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };

  it('top t=0/0.5/1 = NW / 上边中点 / NE（西→东）', () => {
    near(rect.edgePoint(r, Side.Top, 0), -10, -5);
    near(rect.edgePoint(r, Side.Top, 0.5), 0, -5);
    near(rect.edgePoint(r, Side.Top, 1), 10, -5);
  });

  it('left t=0/1 = NW / SW（北→南）', () => {
    near(rect.edgePoint(r, Side.Left, 0), -10, -5);
    near(rect.edgePoint(r, Side.Left, 1), -10, 5);
  });

  it('right / bottom 端点与 9-anchor 一致', () => {
    near(rect.edgePoint(r, Side.Right, 0), 10, -5); // NE
    near(rect.edgePoint(r, Side.Right, 1), 10, 5); // SE
    near(rect.edgePoint(r, Side.Bottom, 0), -10, 5); // SW
    near(rect.edgePoint(r, Side.Bottom, 1), 10, 5); // SE
  });

  it('端点 t=0/1 与 rect.anchor 对应角重合', () => {
    expect(rect.edgePoint(r, Side.Top, 0)).toEqual(rect.anchor(r, Anchor.TopLeft));
    expect(rect.edgePoint(r, Side.Top, 1)).toEqual(rect.anchor(r, Anchor.TopRight));
    expect(rect.edgePoint(r, Side.Top, 0.5)).toEqual(rect.anchor(r, Anchor.Top));
  });

  it('旋转 90° 的 rect：top 上边中点经 local→world', () => {
    const rr = { x: 0, y: 0, width: 20, height: 10, rotate: Math.PI / 2 };

    // 局部 (0,-5) 旋转 90° → (5, 0)
    near(rect.edgePoint(rr, Side.Top, 0.5), 5, 0);
  });
});

describe('ellipse.edgePoint：周长弧段', () => {
  const e = { x: 0, y: 0, rx: 30, ry: 20, rotate: 0 };
  const onEllipse = (p: readonly [number, number]): number => (p[0] / 30) ** 2 + (p[1] / 20) ** 2;

  it('右 t=0.5 = (rx, 0)', () => {
    near(ellipse.edgePoint(e, Side.Right, 0.5), 30, 0);
  });

  it('任意 t 的点都满足椭圆方程', () => {
    for (const t of [0, 0.3, 0.5, 0.7, 1]) {
      expect(onEllipse(ellipse.edgePoint(e, Side.Bottom, t))).toBeCloseTo(1, 6);
      expect(onEllipse(ellipse.edgePoint(e, Side.Left, t))).toBeCloseTo(1, 6);
    }
  });
});
