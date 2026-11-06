import type { CenteredBox, Ellipse } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { Anchor, CenterAnchor, Side, isAnchor, isDirectionalAnchor, isSide } from '../../src/shared';
import { edgeAngleDeg } from '../../src/shared/geometry/edge';
import { ellipse } from '../../src/shared/geometry/ellipse';
import { rect } from '../../src/shared/geometry/rect';

const r10x6: CenteredBox = { x: 0, y: 0, width: 10, height: 6 };

describe('锚定词汇', () => {
  it('识别规范名称而不接受别名', () => {
    expect(isAnchor(CenterAnchor.Center)).toBe(true);
    expect(isAnchor(Anchor.BottomRight)).toBe(true);
    expect(isDirectionalAnchor(Anchor.TopLeft)).toBe(true);
    expect(isDirectionalAnchor(CenterAnchor.Center)).toBe(false);
    expect(isSide(Side.Top)).toBe(true);
    expect(isAnchor('north')).toBe(false);
    expect(isSide('above')).toBe(false);
  });
});

describe('rect.anchor', () => {
  it('返回不旋转的 8 个方向锚点', () => {
    expect(rect.anchor(r10x6, Anchor.Top)).toEqual([0, -3]);
    expect(rect.anchor(r10x6, Anchor.Bottom)).toEqual([0, 3]);
    expect(rect.anchor(r10x6, Anchor.Right)).toEqual([5, 0]);
    expect(rect.anchor(r10x6, Anchor.Left)).toEqual([-5, 0]);
    expect(rect.anchor(r10x6, Anchor.TopRight)).toEqual([5, -3]);
    expect(rect.anchor(r10x6, Anchor.TopLeft)).toEqual([-5, -3]);
    expect(rect.anchor(r10x6, Anchor.BottomRight)).toEqual([5, 3]);
    expect(rect.anchor(r10x6, Anchor.BottomLeft)).toEqual([-5, 3]);
  });

  it('按矩形中心偏移锚点', () => {
    const r: CenteredBox = { x: 100, y: 50, width: 10, height: 6 };

    expect(rect.anchor(r, Anchor.TopRight)).toEqual([105, 47]);
  });

  it('使用矩形旋转顶部和右侧锚点', () => {
    const r: CenteredBox = { ...r10x6, rotate: Math.PI / 2 };
    const [topX, topY] = rect.anchor(r, Anchor.Top);

    expect(topX).toBeCloseTo(3);
    expect(topY).toBeCloseTo(0);

    const [rightX, rightY] = rect.anchor(r, Anchor.Right);

    expect(rightX).toBeCloseTo(0);
    expect(rightY).toBeCloseTo(5);
  });

  it('将 180 度旋转下的顶部映射到未旋转的底部锚点', () => {
    const rRot: CenteredBox = { ...r10x6, rotate: Math.PI };
    const [x, y] = rect.anchor(rRot, Anchor.Top);
    const [sx, sy] = rect.anchor(r10x6, Anchor.Bottom);

    expect(x).toBeCloseTo(sx);
    expect(y).toBeCloseTo(sy);
  });
});

const ellipseBounds: Ellipse = { x: 0, y: 0, rx: 10, ry: 5 };

describe('ellipse.anchor', () => {
  it('4 轴端点对应 N / S / E / W', () => {
    expect(ellipse.anchor(ellipseBounds, Anchor.Right)).toEqual([10, 0]);
    expect(ellipse.anchor(ellipseBounds, Anchor.Left)).toEqual([-10, 0]);
    expect(ellipse.anchor(ellipseBounds, Anchor.Top)).toEqual([0, -5]);
    expect(ellipse.anchor(ellipseBounds, Anchor.Bottom)).toEqual([0, 5]);
  });

  it('对角 anchor 取参数 t=π/4 处：(rx/√2, ry/√2)', () => {
    const ne = ellipse.anchor(ellipseBounds, Anchor.TopRight);

    expect(ne[0]).toBeCloseTo(10 * Math.SQRT1_2);
    expect(ne[1]).toBeCloseTo(-5 * Math.SQRT1_2);
  });
});

const near = (p: readonly [number, number], x: number, y: number, d = 6): void => {
  expect(p[0]).toBeCloseTo(x, d);
  expect(p[1]).toBeCloseTo(y, d);
};

describe('edge 共享方向约定', () => {
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
