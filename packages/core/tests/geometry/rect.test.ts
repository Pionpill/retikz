import { describe, expect, it } from 'vitest';
import { RECT_ANCHORS, type Rect, rect } from '../../src/geometry/rect';

const r10x6: Rect = { x: 0, y: 0, width: 10, height: 6 };

describe('RECT_ANCHORS 常量值', () => {
  it('9 个 anchor 名与 TikZ 命名一致', () => {
    expect(RECT_ANCHORS).toEqual({
      CENTER: 'center',
      NORTH: 'north',
      SOUTH: 'south',
      EAST: 'east',
      WEST: 'west',
      NORTH_EAST: 'north-east',
      NORTH_WEST: 'north-west',
      SOUTH_EAST: 'south-east',
      SOUTH_WEST: 'south-west',
    });
  });
});

describe('rect.center 中心坐标', () => {
  it('中心 = (x, y)', () => {
    expect(rect.center({ x: 3, y: 7, width: 10, height: 4 })).toEqual([3, 7]);
  });
});

describe('rect.contains 不旋转', () => {
  it('中心点在内', () => {
    expect(rect.contains(r10x6, [0, 0])).toBe(true);
  });

  it('边界四角属于"在内"（含等号）', () => {
    expect(rect.contains(r10x6, [5, 3])).toBe(true);
    expect(rect.contains(r10x6, [5, -3])).toBe(true);
    expect(rect.contains(r10x6, [-5, 3])).toBe(true);
    expect(rect.contains(r10x6, [-5, -3])).toBe(true);
  });

  it('边线中点在内', () => {
    expect(rect.contains(r10x6, [5, 0])).toBe(true);
    expect(rect.contains(r10x6, [0, 3])).toBe(true);
  });

  it('外部点 false', () => {
    expect(rect.contains(r10x6, [5.01, 0])).toBe(false);
    expect(rect.contains(r10x6, [0, 3.01])).toBe(false);
    expect(rect.contains(r10x6, [-100, -100])).toBe(false);
  });
});

describe('rect.contains 旋转后', () => {
  // 长 10 高 2 的细矩形，旋转 90° 后视觉变成竖直
  const slim: Rect = { x: 0, y: 0, width: 10, height: 2, rotate: Math.PI / 2 };

  it('旋转后原本"远在水平外"的点落进矩形（沿旋转后的长轴）', () => {
    // 未旋转时 [0, 4] 远超 halfH=1；旋转 90° 后等价于沿原 +x 方向 4 → 在 halfW=5 内
    expect(rect.contains(slim, [0, 4])).toBe(true);
  });

  it('旋转后原本"在矩形内的水平点"落到外', () => {
    // 未旋转时 [4, 0] 在 halfW=5 内；旋转 90° 后等价于沿原 +y 方向 4 → 超出 halfH=1
    expect(rect.contains(slim, [4, 0])).toBe(false);
  });

  it('rotate=0 与省略 rotate 行为一致', () => {
    const noRot: Rect = { x: 0, y: 0, width: 10, height: 6 };
    const rot0: Rect = { ...noRot, rotate: 0 };
    expect(rect.contains(noRot, [4, 2])).toBe(rect.contains(rot0, [4, 2]));
  });

  it('旋转 180° 后 contains 对称（与未旋转完全一致）', () => {
    const rot180: Rect = { ...r10x6, rotate: Math.PI };
    expect(rect.contains(rot180, [3, 2])).toBe(rect.contains(r10x6, [3, 2]));
    expect(rect.contains(rot180, [5.01, 0])).toBe(false);
  });
});

describe('rect.anchor 9 个标准锚点', () => {
  it('center / 四边中点 / 四角（不旋转）', () => {
    expect(rect.anchor(r10x6, 'center')).toEqual([0, 0]);
    expect(rect.anchor(r10x6, 'north')).toEqual([0, -3]);
    expect(rect.anchor(r10x6, 'south')).toEqual([0, 3]);
    expect(rect.anchor(r10x6, 'east')).toEqual([5, 0]);
    expect(rect.anchor(r10x6, 'west')).toEqual([-5, 0]);
    expect(rect.anchor(r10x6, 'north-east')).toEqual([5, -3]);
    expect(rect.anchor(r10x6, 'north-west')).toEqual([-5, -3]);
    expect(rect.anchor(r10x6, 'south-east')).toEqual([5, 3]);
    expect(rect.anchor(r10x6, 'south-west')).toEqual([-5, 3]);
  });

  it('用 RECT_ANCHORS 常量取值与字面量一致', () => {
    expect(rect.anchor(r10x6, RECT_ANCHORS.NORTH_EAST)).toEqual(
      rect.anchor(r10x6, 'north-east'),
    );
  });

  it('non-origin 中心矩形：anchor 基于 (x, y) 偏移', () => {
    const r: Rect = { x: 100, y: 50, width: 10, height: 6 };
    expect(rect.anchor(r, 'center')).toEqual([100, 50]);
    expect(rect.anchor(r, 'north-east')).toEqual([105, 47]);
  });

  it('旋转 90° 后 anchor 跟着转：north 局部 [0,-3] → 世界 [3, 0]', () => {
    const r: Rect = { ...r10x6, rotate: Math.PI / 2 };
    const [x, y] = rect.anchor(r, 'north');
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(0);
  });

  it('旋转 90° 后 east 局部 [5, 0] → 世界 [0, 5]', () => {
    const r: Rect = { ...r10x6, rotate: Math.PI / 2 };
    const [x, y] = rect.anchor(r, 'east');
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(5);
  });

  it('旋转 180° 后 north 与未旋转 south 同位', () => {
    const rRot: Rect = { ...r10x6, rotate: Math.PI };
    const [x, y] = rect.anchor(rRot, 'north');
    const [sx, sy] = rect.anchor(r10x6, 'south');
    expect(x).toBeCloseTo(sx);
    expect(y).toBeCloseTo(sy);
  });
});

describe('rect.boundaryPoint 中心向外射线与边界交点', () => {
  it('中心向 +x 射线 → east 中点', () => {
    expect(rect.boundaryPoint(r10x6, [10, 0])).toEqual([5, 0]);
  });

  it('中心向 +y 射线 → south 中点', () => {
    expect(rect.boundaryPoint(r10x6, [0, 10])).toEqual([0, 3]);
  });

  it('中心向 -x 射线 → west 中点', () => {
    expect(rect.boundaryPoint(r10x6, [-10, 0])).toEqual([-5, 0]);
  });

  it('中心向 -y 射线 → north 中点', () => {
    expect(rect.boundaryPoint(r10x6, [0, -10])).toEqual([0, -3]);
  });

  it('过角点方向 → 角点', () => {
    // 朝 [10, 6] 即 [w, h] 方向：localX/halfW = 10/5 = 2, localY/halfH = 6/3 = 2，t=0.5 → [5, 3]
    const [x, y] = rect.boundaryPoint(r10x6, [10, 6]);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(3);
  });

  it('toward = 中心 → 返回中心本身', () => {
    expect(rect.boundaryPoint(r10x6, [0, 0])).toEqual([0, 0]);
  });

  it('在偏离中心矩形上：射线从 (x,y) 出发', () => {
    const r: Rect = { x: 100, y: 50, width: 10, height: 6 };
    expect(rect.boundaryPoint(r, [200, 50])).toEqual([105, 50]);
  });

  it('旋转 90° 后向世界 +x 方向：交点是原 north anchor 的旋转位置 [3, 0]', () => {
    const r: Rect = { ...r10x6, rotate: Math.PI / 2 };
    const [x, y] = rect.boundaryPoint(r, [10, 0]);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(0);
  });

  it('旋转矩形：boundary point 落在矩形某条边上（与至少一条半轴等长）', () => {
    const r: Rect = { x: 5, y: 5, width: 8, height: 4, rotate: Math.PI / 6 };
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    const targets: Array<[number, number]> = [
      [50, 5],
      [5, 50],
      [-50, -50],
      [50, -20],
    ];
    // 用 worldToLocal 等价构造：把 hit 转回本地坐标，应满足 |lx|≈halfW 或 |ly|≈halfH（碰到一条边）
    const cos = Math.cos(r.rotate ?? 0);
    const sin = Math.sin(r.rotate ?? 0);
    for (const t of targets) {
      const hit = rect.boundaryPoint(r, t);
      const dx = hit[0] - r.x;
      const dy = hit[1] - r.y;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const onVerticalEdge = Math.abs(Math.abs(lx) - halfW) < 1e-9;
      const onHorizontalEdge = Math.abs(Math.abs(ly) - halfH) < 1e-9;
      expect(onVerticalEdge || onHorizontalEdge).toBe(true);
    }
  });
});
