/**
 * 边上比例点 edgePoint 几何单元测试（ADR-02）
 * @description 覆盖 rect 直边 / circle·ellipse 周长弧段 / diamond 过顶点折线四种真实边界几何；
 *   方向约定 north/south=西→东、east/west=北→南；端点与现有 9-anchor 重合；含旋转
 */
import { describe, expect, it } from 'vitest';
import { rect } from '../../src/geometry/rect';
import { circle } from '../../src/geometry/circle';
import { ellipse } from '../../src/geometry/ellipse';
import { diamond } from '../../src/geometry/diamond';
import { EDGE_ENDS, edgeAngleDeg, lerpPoint } from '../../src/geometry/edge';

const near = (p: readonly [number, number], x: number, y: number, d = 6): void => {
  expect(p[0]).toBeCloseTo(x, d);
  expect(p[1]).toBeCloseTo(y, d);
};

describe('edge 共享方向约定', () => {
  it('EDGE_ENDS：north/south 西→东，east/west 北→南', () => {
    expect(EDGE_ENDS.north).toEqual(['north-west', 'north-east']);
    expect(EDGE_ENDS.south).toEqual(['south-west', 'south-east']);
    expect(EDGE_ENDS.east).toEqual(['north-east', 'south-east']);
    expect(EDGE_ENDS.west).toEqual(['north-west', 'south-west']);
  });

  it('edgeAngleDeg：四 side 的 θ(t) 与角度表一致', () => {
    expect(edgeAngleDeg('north', 0)).toBeCloseTo(225, 6);
    expect(edgeAngleDeg('north', 0.5)).toBeCloseTo(270, 6);
    expect(edgeAngleDeg('north', 1)).toBeCloseTo(315, 6);
    expect(edgeAngleDeg('south', 0)).toBeCloseTo(135, 6);
    expect(edgeAngleDeg('south', 1)).toBeCloseTo(45, 6);
    expect(edgeAngleDeg('east', 0)).toBeCloseTo(-45, 6);
    expect(edgeAngleDeg('east', 1)).toBeCloseTo(45, 6);
    expect(edgeAngleDeg('west', 0)).toBeCloseTo(225, 6);
    expect(edgeAngleDeg('west', 1)).toBeCloseTo(135, 6);
  });

  it('lerpPoint：线性插值', () => {
    near(lerpPoint([0, 0], [10, 20], 0.5), 5, 10);
    near(lerpPoint([0, 0], [10, 20], 0), 0, 0);
    near(lerpPoint([0, 0], [10, 20], 1), 10, 20);
  });
});

describe('rect.edgePoint：矩形四直边', () => {
  // w=20,h=10 → halfW=10, halfH=5；anchors NW(-10,-5) NE(10,-5) SW(-10,5) SE(10,5)
  const r = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };

  it('north t=0/0.5/1 = NW / 上边中点 / NE（西→东）', () => {
    near(rect.edgePoint(r, 'north', 0), -10, -5);
    near(rect.edgePoint(r, 'north', 0.5), 0, -5);
    near(rect.edgePoint(r, 'north', 1), 10, -5);
  });

  it('west t=0/1 = NW / SW（北→南）', () => {
    near(rect.edgePoint(r, 'west', 0), -10, -5);
    near(rect.edgePoint(r, 'west', 1), -10, 5);
  });

  it('east / south 端点与 9-anchor 一致', () => {
    near(rect.edgePoint(r, 'east', 0), 10, -5); // NE
    near(rect.edgePoint(r, 'east', 1), 10, 5); // SE
    near(rect.edgePoint(r, 'south', 0), -10, 5); // SW
    near(rect.edgePoint(r, 'south', 1), 10, 5); // SE
  });

  it('端点 t=0/1 与 rect.anchor 对应角重合', () => {
    expect(rect.edgePoint(r, 'north', 0)).toEqual(rect.anchor(r, 'north-west'));
    expect(rect.edgePoint(r, 'north', 1)).toEqual(rect.anchor(r, 'north-east'));
    expect(rect.edgePoint(r, 'north', 0.5)).toEqual(rect.anchor(r, 'north'));
  });

  it('旋转 90° 的 rect：north 上边中点经 local→world', () => {
    const rr = { x: 0, y: 0, width: 20, height: 10, rotate: Math.PI / 2 };
    // 局部 (0,-5) 旋转 90° → (5, 0)
    near(rect.edgePoint(rr, 'north', 0.5), 5, 0);
  });
});

describe('circle.edgePoint：周长弧段（真实边界，非外接矩形边）', () => {
  const c = { x: 0, y: 0, radius: 20, rotate: 0 };
  const onCircle = (p: readonly [number, number]): number => Math.hypot(p[0], p[1]);

  it('east t=0.5 = (radius, 0)，t=0/1 = NE/SE 对角', () => {
    near(circle.edgePoint(c, 'east', 0.5), 20, 0);
    near(circle.edgePoint(c, 'east', 0), 20 * Math.SQRT1_2, -20 * Math.SQRT1_2); // NE
    near(circle.edgePoint(c, 'east', 1), 20 * Math.SQRT1_2, 20 * Math.SQRT1_2); // SE
  });

  it('north t=0.5 = (0, -radius)', () => {
    near(circle.edgePoint(c, 'north', 0.5), 0, -20);
  });

  it('任意 t 的点都落在圆周上（dist == radius）', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(onCircle(circle.edgePoint(c, 'north', t))).toBeCloseTo(20, 6);
      expect(onCircle(circle.edgePoint(c, 'east', t))).toBeCloseTo(20, 6);
    }
  });

  it('端点 t=0.5 与 circle.anchor 的 cardinal 点重合', () => {
    near(circle.edgePoint(c, 'north', 0.5), circle.anchor(c, 'north')[0], circle.anchor(c, 'north')[1]);
    near(circle.edgePoint(c, 'west', 0.5), circle.anchor(c, 'west')[0], circle.anchor(c, 'west')[1]);
  });
});

describe('ellipse.edgePoint：周长弧段', () => {
  const e = { x: 0, y: 0, rx: 30, ry: 20, rotate: 0 };
  const onEllipse = (p: readonly [number, number]): number => (p[0] / 30) ** 2 + (p[1] / 20) ** 2;

  it('east t=0.5 = (rx, 0)', () => {
    near(ellipse.edgePoint(e, 'east', 0.5), 30, 0);
  });

  it('任意 t 的点都满足椭圆方程', () => {
    for (const t of [0, 0.3, 0.5, 0.7, 1]) {
      expect(onEllipse(ellipse.edgePoint(e, 'south', t))).toBeCloseTo(1, 6);
      expect(onEllipse(ellipse.edgePoint(e, 'west', t))).toBeCloseTo(1, 6);
    }
  });
});

describe('diamond.edgePoint：过 cardinal 顶点的两段折线', () => {
  // w=20,h=30 → halfA=10, halfB=15；顶点 N(0,-15) S(0,15) E(10,0) W(-10,0)
  // 边中点 NW(-5,-7.5) NE(5,-7.5) SW(-5,7.5) SE(5,7.5)
  const d = { x: 0, y: 0, halfA: 10, halfB: 15, rotate: 0 };

  it('north t=0/0.5/1 = NW中点 / N顶点 / NE中点', () => {
    near(diamond.edgePoint(d, 'north', 0), -5, -7.5);
    near(diamond.edgePoint(d, 'north', 0.5), 0, -15);
    near(diamond.edgePoint(d, 'north', 1), 5, -7.5);
  });

  it('north t=0.25 落在 NW中点→N顶点 连线（真实斜边）上', () => {
    // lerp((-5,-7.5),(0,-15),0.5) = (-2.5,-11.25)
    near(diamond.edgePoint(d, 'north', 0.25), -2.5, -11.25);
  });

  it('east t=0.5 = E 顶点；t=0/1 = NE/SE 中点（北→南）', () => {
    near(diamond.edgePoint(d, 'east', 0.5), 10, 0);
    near(diamond.edgePoint(d, 'east', 0), 5, -7.5);
    near(diamond.edgePoint(d, 'east', 1), 5, 7.5);
  });

  it('每个 t 的点都在菱形边界上（|x|/halfA + |y|/halfB == 1）', () => {
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const p = diamond.edgePoint(d, side, t);
        expect(Math.abs(p[0]) / 10 + Math.abs(p[1]) / 15).toBeCloseTo(1, 6);
      }
    }
  });

  it('t=0.5 与 diamond.anchor cardinal 顶点重合', () => {
    expect(diamond.edgePoint(d, 'north', 0.5)).toEqual(diamond.anchor(d, 'north'));
    expect(diamond.edgePoint(d, 'east', 0.5)).toEqual(diamond.anchor(d, 'east'));
  });
});
