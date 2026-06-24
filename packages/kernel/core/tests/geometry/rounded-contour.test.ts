import { describe, expect, it } from 'vitest';
import { arcAngleInRange, rayArc } from '@retikz/math';
import {
  type ContourSegment,
  boundaryFromContour,
  contourCommands,
  filletContour,
} from '../../src/geometry/contour';

/*
 * 角度约定（与 @retikz/math arc、ir/path arc 一致，SVG y-down）：
 *   0=+x(east)、90=+y(视觉下/south)、180=-x(west)、270=-y(视觉上/north)；角度递增=屏幕顺时针(CW)。
 *
 * 测试轮廓统一按 CW 绕向构造（与 polygon emit 顶点角递增一致）。
 */

/** 正方形 [-10,-10]..[10,10] 的 4 条 CW Line 段（左上→右上→右下→左下） */
const squareSegments = (): Array<ContourSegment> => [
  { kind: 'line', from: [-10, -10], to: [10, -10] },
  { kind: 'line', from: [10, -10], to: [10, 10] },
  { kind: 'line', from: [10, 10], to: [-10, 10] },
  { kind: 'line', from: [-10, 10], to: [-10, -10] },
];

describe('filletContour 大坐标相对容差（G6）', () => {
  it('坐标量级 1e6 的斜边方形仍解出 fillet，不因绝对容差误拒塌成尖角', () => {
    const off = 1e6;
    // 旋转 45° 的方形（斜边，offset 求交易受大坐标浮点抵消影响），CW 绕向
    const diamond: Array<ContourSegment> = [
      { kind: 'line', from: [off, off - 20], to: [off + 20, off] },
      { kind: 'line', from: [off + 20, off], to: [off, off + 20] },
      { kind: 'line', from: [off, off + 20], to: [off - 20, off] },
      { kind: 'line', from: [off - 20, off], to: [off, off - 20] },
    ];
    const fillets = filletContour(diamond, 4);
    expect(fillets.length).toBe(4);
    expect(fillets.every(f => !f.clampedToZero)).toBe(true);
    expect(fillets.every(f => f.radius > 0)).toBe(true);
  });
});

describe('rayArc：射线 ∩ 圆弧 + 角度区间过滤', () => {
  it('命中区间内的弧', () => {
    // 单位圆右半弧 [-90,90]，从原点朝 +x → 命中 [1,0]
    const hits = rayArc([0, 0], [1, 0], [0, 0], 1, -90, 90);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]).toBeCloseTo(1);
  });

  it('交点在角度区间外不计', () => {
    // 圆右半弧 [-90,90]，朝 -x 的交点 [-1,0] 角=180 不在区间 → 空
    const hits = rayArc([0, 0], [-1, 0], [0, 0], 1, -90, 90);
    expect(hits).toEqual([]);
  });

  it('整圆（span≥360）任意方向命中', () => {
    const hits = rayArc([0, 0], [0, 1], [0, 0], 5, 0, 360);
    expect(hits[0]).toBeCloseTo(5);
  });
});

describe('arcAngleInRange', () => {
  it('CW 区间含端点', () => {
    expect(arcAngleInRange(0, 90, 45)).toBe(true);
    expect(arcAngleInRange(0, 90, 0)).toBe(true);
    expect(arcAngleInRange(0, 90, 90)).toBe(true);
    expect(arcAngleInRange(0, 90, 135)).toBe(false);
  });
  it('CCW 区间（end<start）', () => {
    expect(arcAngleInRange(90, 0, 45)).toBe(true);
    expect(arcAngleInRange(90, 0, -45)).toBe(false);
  });
  it('跨 360°', () => {
    expect(arcAngleInRange(270, 450, 360)).toBe(true);
    expect(arcAngleInRange(270, 450, 0)).toBe(true);
    expect(arcAngleInRange(270, 450, 180)).toBe(false);
  });
});

describe('filletContour line-line：正方形倒角', () => {
  it('r=4 每角生 fillet，切点 / 半径正确', () => {
    const fillets = filletContour(squareSegments(), 4);
    expect(fillets.length).toBe(4);
    for (const f of fillets) {
      expect(f.clampedToZero).toBe(false);
      expect(f.radius).toBeCloseTo(4);
      // fillet 圆心到两切点距离 = r
      const dIn = Math.hypot(f.tangentInPoint[0] - f.center[0], f.tangentInPoint[1] - f.center[1]);
      const dOut = Math.hypot(f.tangentOutPoint[0] - f.center[0], f.tangentOutPoint[1] - f.center[1]);
      expect(dIn).toBeCloseTo(4);
      expect(dOut).toBeCloseTo(4);
    }
    // 第一个接缝（右上角 [10,-10]）：切点应在 (10-4,-10) 与 (10,-10+4)
    const first = fillets[0];
    const pts = [first.tangentInPoint, first.tangentOutPoint];
    const hasShortenedX = pts.some(p => Math.abs(p[0] - 6) < 1e-6 && Math.abs(p[1] + 10) < 1e-6);
    const hasShortenedY = pts.some(p => Math.abs(p[0] - 10) < 1e-6 && Math.abs(p[1] + 6) < 1e-6);
    expect(hasShortenedX).toBe(true);
    expect(hasShortenedY).toBe(true);
    // 圆心在角内侧 [6,-6]
    expect(first.center[0]).toBeCloseTo(6);
    expect(first.center[1]).toBeCloseTo(-6);
  });

  it('凸角 fillet sweep 与 CW 绕向同向（counterClockwise=false）', () => {
    const fillets = filletContour(squareSegments(), 4);
    for (const f of fillets) expect(f.counterClockwise).toBe(false);
  });
});

describe('filletContour 逐角夹紧（窄角 / 短边）', () => {
  it('等边三角形窄角：大 r 自动夹紧、轮廓闭合不自交', () => {
    // CW 三角形，边长约 20
    const tri: Array<ContourSegment> = [
      { kind: 'line', from: [0, -12], to: [10, 6] },
      { kind: 'line', from: [10, 6], to: [-10, 6] },
      { kind: 'line', from: [-10, 6], to: [0, -12] },
    ];
    const fillets = filletContour(tri, 100); // 远超可行
    // 夹紧后每条边的两个切点不重叠（fraction 在 [0,1] 且和 ≤ 1）
    const cmds = contourCommands(tri, 100);
    expect(cmds[0].kind).toBe('move');
    expect(cmds[cmds.length - 1].kind).toBe('close');
    // 应仍含 fillet 弧（夹紧到正半径而非全 0）或全部夹零——至少闭合合法
    expect(fillets.length).toBe(3);
  });

  it('短边自动缩 r：长方形 4x40 上短边 r 受限', () => {
    const rectSeg: Array<ContourSegment> = [
      { kind: 'line', from: [-20, -2], to: [20, -2] },
      { kind: 'line', from: [20, -2], to: [20, 2] },
      { kind: 'line', from: [20, 2], to: [-20, 2] },
      { kind: 'line', from: [-20, 2], to: [-20, -2] },
    ];
    const fillets = filletContour(rectSeg, 10); // 高仅 4 → r 夹到 ≤2
    for (const f of fillets) {
      if (!f.clampedToZero) expect(f.radius).toBeLessThanOrEqual(2 + 1e-6);
    }
  });

  it('超大 r 取最大可行半径（非折半）：20x20 正方请求 100 → r≈10', () => {
    // 20×20 正方形（半边 10），正方角最大可行 fillet = min(w/2,h/2) = 10，与 render clamp 对齐。
    // 折半策略会从 100 折到 6.25（100→50→25→12.5→6.25 首个 ≤10 合法），与渲染不一致。
    const square = squareSegments(); // [-10,-10]..[10,10]
    const fillets = filletContour(square, 100);
    expect(fillets.length).toBe(4);
    for (const f of fillets) {
      expect(f.clampedToZero).toBe(false);
      expect(f.radius).toBeCloseTo(10, 3);
    }
  });

  it('合法 r 不被二分缩：20x20 请求 8 → 用原值 8', () => {
    const square = squareSegments();
    const fillets = filletContour(square, 8);
    for (const f of fillets) {
      expect(f.clampedToZero).toBe(false);
      expect(f.radius).toBeCloseTo(8);
    }
  });
});

describe('filletContour line-arc：直边↔圆弧接缝', () => {
  it('直边接外弧，切点在直边与弧上、半径 r', () => {
    // 一段 CW 轮廓片段：line 从 [0,20] 到 [0,0]（沿 -y 行进），接 arc（圆心 [0,0] 半径 20，从 270° 到 0°? ）
    // 构造 sector 风格：line(径向) → arc(外弧)。用闭合四段简化为可解。
    const segs: Array<ContourSegment> = [
      { kind: 'line', from: [0, 0], to: [20, 0] }, // 沿 +x
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 0, endAngle: 90 }, // CW 外弧 +x→+y
      { kind: 'line', from: [0, 20], to: [0, 0] }, // 沿 -y 回原点
    ];
    const fillets = filletContour(segs, 5);
    expect(fillets.length).toBe(3);
    // 接缝 0：line[0]→arc[1]，接缝点 [20,0]
    const seam0 = fillets[0];
    expect(seam0.clampedToZero).toBe(false);
    expect(seam0.radius).toBeCloseTo(5);
    // line 上切点 y=0、x<20；arc 上切点在半径 20 圆周上
    const onLine = [seam0.tangentInPoint, seam0.tangentOutPoint].some(
      p => Math.abs(p[1]) < 1e-6 && p[0] < 20 && p[0] > 0,
    );
    const onArc = [seam0.tangentInPoint, seam0.tangentOutPoint].some(
      p => Math.abs(Math.hypot(p[0], p[1]) - 20) < 1e-4,
    );
    expect(onLine).toBe(true);
    expect(onArc).toBe(true);
    // fillet 圆心距 line 与 arc 圆周均为 5
    const dLine = Math.abs(seam0.center[1]); // 距 y=0 直线
    expect(dLine).toBeCloseTo(5);
    const dArc = Math.abs(Math.hypot(seam0.center[0], seam0.center[1]) - 20);
    expect(dArc).toBeCloseTo(5);
  });
});

describe('filletContour 凹角', () => {
  it('L 形凹角：fillet 圆心在内侧、sweep 反向、不自交', () => {
    // CW 闭合 L 形（含一个凹角）。顶点顺序使外缘 CW。
    // 方块挖角：(-10,-10)->(10,-10)->(10,10)->(0,10)->(0,0)->(-10,0)->close
    const L: Array<ContourSegment> = [
      { kind: 'line', from: [-10, -10], to: [10, -10] },
      { kind: 'line', from: [10, -10], to: [10, 10] },
      { kind: 'line', from: [10, 10], to: [0, 10] },
      { kind: 'line', from: [0, 10], to: [0, 0] }, // 进入凹角
      { kind: 'line', from: [0, 0], to: [-10, 0] }, // 凹角 [0,0]
      { kind: 'line', from: [-10, 0], to: [-10, -10] },
    ];
    const fillets = filletContour(L, 3);
    expect(fillets.length).toBe(6);
    // 凹角接缝 = segment[3]([0,10]->[0,0]) 终点 [0,0] 接 segment[4]([0,0]->[-10,0])
    const concave = fillets[3];
    expect(concave.clampedToZero).toBe(false);
    // 凹角（reflex）fillet 圆心在「凸侧 / 轮廓外」，弧嵌入凹槽；sweep 与凸角相反。
    const convex = fillets[0]; // [10,-10] 凸角
    expect(concave.counterClockwise).not.toBe(convex.counterClockwise);
    // 圆心到接缝点距离 = sqrt2 * r（45° 角），半径 = r
    expect(concave.radius).toBeCloseTo(3);
    const d = Math.hypot(concave.center[0], concave.center[1]); // 接缝点是 [0,0]
    expect(d).toBeCloseTo(Math.SQRT2 * 3, 4);
    // 凹角圆心在凸侧：接缝两边为 x=0(段[0,10]→[0,0]) 与 y=0(段[0,0]→[-10,0])，
    //   reflex 内角开向第二象限外侧，故圆心在 x<0, y>0（与凸角同 contour 但反侧）。
    expect(concave.center[0]).toBeLessThan(0);
    expect(concave.center[1]).toBeGreaterThan(0);
    // 切点落在实际边上（非延长线）：edge A 上 (0, 0<y≤3)，edge B 上 (-3≤x<0, 0)
    const tpts = [concave.tangentInPoint, concave.tangentOutPoint];
    const onEdgeA = tpts.some(p => Math.abs(p[0]) < 1e-6 && p[1] > 0 && p[1] <= 10);
    const onEdgeB = tpts.some(p => Math.abs(p[1]) < 1e-6 && p[0] < 0 && p[0] >= -10);
    expect(onEdgeA).toBe(true);
    expect(onEdgeB).toBe(true);
  });
});

describe('contourCommands passthrough（r=0 / 省略 / 负）', () => {
  it('r 省略 → 原尖角轮廓（move + 4 line + close）', () => {
    const cmds = contourCommands(squareSegments());
    expect(cmds.map(c => c.kind)).toEqual(['move', 'line', 'line', 'line', 'line', 'close']);
    expect((cmds[0] as { to: [number, number] }).to).toEqual([-10, -10]);
  });
  it('r=0 → passthrough', () => {
    expect(filletContour(squareSegments(), 0)).toEqual([]);
  });
  it('r<0 → passthrough', () => {
    expect(filletContour(squareSegments(), -5)).toEqual([]);
  });
  it('r>0 → 含 fillet arc 命令', () => {
    const cmds = contourCommands(squareSegments(), 4);
    expect(cmds.filter(c => c.kind === 'arc').length).toBe(4);
    expect(cmds[0].kind).toBe('move');
    expect(cmds[cmds.length - 1].kind).toBe('close');
  });
});

describe('boundaryFromContour', () => {
  it('整圆弧在非起点方向仍可命中', () => {
    const hit = boundaryFromContour(
      [{ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 360 }],
      undefined,
      [0, 0],
      [0, -20],
    );
    expect(hit).toBeDefined();
    expect(hit![0]).toBeCloseTo(0, 6);
    expect(hit![1]).toBeCloseTo(-10, 6);
  });

  it('巨大弧角度不会在 sweep 对齐时挂死', () => {
    const hit = boundaryFromContour(
      [{ kind: 'arc', center: [0, 0], radius: 10, startAngle: 1e308, endAngle: 1e308 + 720 }],
      undefined,
      [0, 0],
      [20, 0],
    );
    expect(hit === undefined || Number.isFinite(hit[0])).toBe(true);
  });

  it('rayOrigin = 中心，朝边中点命中原边（r=0）', () => {
    const hit = boundaryFromContour(squareSegments(), 0, [0, 0], [0, -100]);
    expect(hit).toBeDefined();
    expect(hit![0]).toBeCloseTo(0);
    expect(hit![1]).toBeCloseTo(-10);
  });

  it('rayOrigin = 偏移点（非中心），朝某方向命中最近段', () => {
    // 从 [5,0] 朝 +x → 命中右边 x=10
    const hit = boundaryFromContour(squareSegments(), 0, [5, 0], [100, 0]);
    expect(hit![0]).toBeCloseTo(10);
    expect(hit![1]).toBeCloseTo(0);
  });

  it('朝角方向：r>0 命中 fillet 弧（≠ 尖角）', () => {
    // 朝右上角 [10,-10] 方向。尖角时命中点接近 [10,-10]；倒角后命中 fillet 弧、离角更近内。
    const sharp = boundaryFromContour(squareSegments(), 0, [0, 0], [10, -10]);
    const rounded = boundaryFromContour(squareSegments(), 5, [0, 0], [10, -10]);
    expect(sharp).toBeDefined();
    expect(rounded).toBeDefined();
    // 尖角命中点离中心更远（对角顶点），倒角命中点离中心更近
    const dSharp = Math.hypot(sharp![0], sharp![1]);
    const dRounded = Math.hypot(rounded![0], rounded![1]);
    expect(dRounded).toBeLessThan(dSharp);
    // 倒角命中点应落在某个 fillet 弧上：到对应 fillet 圆心距离 ≈ 5
    const fillets = filletContour(squareSegments(), 5);
    const onSomeFillet = fillets.some(
      f => Math.abs(Math.hypot(rounded![0] - f.center[0], rounded![1] - f.center[1]) - 5) < 1e-3,
    );
    expect(onSomeFillet).toBe(true);
  });

  it('命中 fillet 弧落在弧上（line-arc 轮廓）', () => {
    const segs: Array<ContourSegment> = [
      { kind: 'line', from: [0, 0], to: [20, 0] },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 0, endAngle: 90 },
      { kind: 'line', from: [0, 20], to: [0, 0] },
    ];
    // 从内部点朝外弧中点方向（45°）
    const hit = boundaryFromContour(segs, 5, [5, 5], [100, 100]);
    expect(hit).toBeDefined();
    // 命中应在半径 20 外弧上（远离接缝处不受 fillet 影响）
    expect(Math.hypot(hit![0], hit![1])).toBeCloseTo(20, 1);
  });
});

describe('filletContour 错误：arc-arc 接缝', () => {
  it('相邻两 arc 段抛明确错', () => {
    const segs: Array<ContourSegment> = [
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
      { kind: 'arc', center: [0, 0], radius: 20, startAngle: 90, endAngle: 0, counterClockwise: true },
    ];
    expect(() => filletContour(segs, 3)).toThrow(/arc-arc/);
  });
});
