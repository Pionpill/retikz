import { type Position, point as pointOps } from './point';

/*
 * 段几何采样工具：给边标注（step.label）算位置 / 切线。
 * 每种段（line/quad/cubic/fold/arc/circle/ellipse）提供 `*SegmentSample`：
 * 段参数 + t∈[0,1] → t 处点坐标与归一化切线。
 * label.position 把 t 映射 0.25/0.5/0.75（near-start/midway/near-end）。
 *
 * 参数化约定：
 * - 直线/贝塞尔：标准参数（line t·(to-from)+from；Bezier 标准式）
 * - fold：t∈[0,0.5] 走第一段（参数 2t），t∈(0.5,1] 走第二段（参数 2t-1）；t=0.5 落 corner 切线取第一段方向
 * - arc：angle(t) = startAngle + t·(end-start)；切线沿扫描方向
 * - circle/ellipse：angle = t·360°，从 0°(east) 开始
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * 段几何采样结果：t 处坐标点 + 归一化切线向量
 * @description 各 `*SegmentSample` 函数（line / quad / cubic / fold / arc / circle / ellipse）的统一返回形态；供 step.label emit 算位置 / 切线 / sloped 旋转角
 */
export type SegmentSample = {
  /** t 处的点（user units） */
  point: Position;
  /** t 处的切线（单位向量；零向量时回退 [1, 0]） */
  tangent: Position;
};

const sampleEllipseArc = (
  center: Position,
  rx: number,
  ry: number,
  startAngleDeg: number,
  endAngleDeg: number,
  t: number,
): SegmentSample => {
  const angleDeg = startAngleDeg + t * (endAngleDeg - startAngleDeg);
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sweepSign = endAngleDeg >= startAngleDeg ? 1 : -1;
  return {
    point: [center[0] + rx * cos, center[1] + ry * sin],
    tangent: pointOps.normalize([-rx * sin * sweepSign, ry * cos * sweepSign]),
  };
};

/** 直线段 from → to */
export const lineSegmentSample = (
  from: Position,
  to: Position,
  t: number,
): SegmentSample => ({
  point: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t],
  tangent: pointOps.normalize([to[0] - from[0], to[1] - from[1]]),
});

/**
 * 二次贝塞尔 from → control → to
 * @description P(t) = (1-t)²P0 + 2(1-t)t·P1 + t²P2；P'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
 */
export const quadSegmentSample = (
  from: Position,
  control: Position,
  to: Position,
  t: number,
): SegmentSample => {
  const u = 1 - t;
  const point: Position = [
    u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
    u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
  ];
  const tx = 2 * u * (control[0] - from[0]) + 2 * t * (to[0] - control[0]);
  const ty = 2 * u * (control[1] - from[1]) + 2 * t * (to[1] - control[1]);
  return { point, tangent: pointOps.normalize([tx, ty]) };
};

/**
 * 三次贝塞尔 from → c1 → c2 → to
 * @description P'(t) = 3(1-t)²(P1-P0) + 6(1-t)t(P2-P1) + 3t²(P3-P2)
 */
export const cubicSegmentSample = (
  from: Position,
  c1: Position,
  c2: Position,
  to: Position,
  t: number,
): SegmentSample => {
  const u = 1 - t;
  const point: Position = [
    u * u * u * from[0] +
      3 * u * u * t * c1[0] +
      3 * u * t * t * c2[0] +
      t * t * t * to[0],
    u * u * u * from[1] +
      3 * u * u * t * c1[1] +
      3 * u * t * t * c2[1] +
      t * t * t * to[1],
  ];
  const tx =
    3 * u * u * (c1[0] - from[0]) +
    6 * u * t * (c2[0] - c1[0]) +
    3 * t * t * (to[0] - c2[0]);
  const ty =
    3 * u * u * (c1[1] - from[1]) +
    6 * u * t * (c2[1] - c1[1]) +
    3 * t * t * (to[1] - c2[1]);
  return { point, tangent: pointOps.normalize([tx, ty]) };
};

/**
 * 折角段 from → corner → to
 * @description t∈[0,0.5] 走第一段（参数 2t）；t∈(0.5,1] 走第二段（参数 2t-1）；t=0.5 落 corner 切线取第一段方向
 */
export const foldSegmentSample = (
  from: Position,
  corner: Position,
  to: Position,
  t: number,
): SegmentSample => {
  if (t <= 0.5) return lineSegmentSample(from, corner, t * 2);
  return lineSegmentSample(corner, to, t * 2 - 1);
};

/** 弧段（角度度数，与 ir/path arc 同约定）；切线沿扫描方向：endAngle ≥ start 取 (-sin,cos)，否则反向 */
export const arcSegmentSample = (
  center: Position,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  t: number,
): SegmentSample => sampleEllipseArc(center, radius, radius, startAngleDeg, endAngleDeg, t);

/** 椭圆弧段（参数角度数，与 ir/path arc 同约定）；点用 (rx·cos, ry·sin)，切线沿扫描方向 */
export const ellipseArcSegmentSample = (
  center: Position,
  rx: number,
  ry: number,
  startAngleDeg: number,
  endAngleDeg: number,
  t: number,
): SegmentSample => sampleEllipseArc(center, rx, ry, startAngleDeg, endAngleDeg, t);

/** 整圆，从 0°(east) 开始，与 compile/path circlePath 输出方向（右→左→右，sweep=1）一致 */
export const circleSegmentSample = (
  center: Position,
  radius: number,
  t: number,
): SegmentSample => sampleEllipseArc(center, radius, radius, 0, 360, t);

/** 整椭圆，参数化 (rx·cos(2πt), ry·sin(2πt)) */
export const ellipseSegmentSample = (
  center: Position,
  rx: number,
  ry: number,
  t: number,
): SegmentSample => sampleEllipseArc(center, rx, ry, 0, 360, t);

/**
 * 矩形周长段：两对角 → 闭合周长上 t∈[0,1] 的点 / 切线
 * @description 4 条边按 rectOutline 的顺时针绕向（y-down：左上→右上→右下→左下→闭合回左上）均分参数，
 *   每条边占 1/4 t；切线 = 该边方向。忽略 cornerRadius（采尖角折线周长），mark 落在直边上精确、
 *   贴近圆角处略偏轮廓——对中段 marking 足够。退化（零宽 / 零高）由 lineSegmentSample 的零切线回退兜底。
 */
export const rectPerimeterSample = (
  from: Position,
  to: Position,
  t: number,
): SegmentSample => {
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const y0 = Math.min(from[1], to[1]);
  const y1 = Math.max(from[1], to[1]);
  // 与 rectOutline 同序 / 同向：左上 → 右上 → 右下 → 左下 → 闭合回左上
  const corners: Array<Position> = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const scaled = clamped * 4;
  const edge = Math.min(Math.floor(scaled), 3);
  const localT = scaled - edge;
  return lineSegmentSample(corners[edge], corners[edge + 1], localT);
};
