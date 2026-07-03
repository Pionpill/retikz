/** 角度区间（单位：度），用于描述沿屏幕坐标系的有向扫描范围。 */
export type AngleRange = {
  /** 规范化后的起始角（度）。 */
  start: number;
  /** 规范化后的终止角（度），落在起始角之后最多一整圈。 */
  end: number;
  /** 起止角中分角（度）。 */
  mid: number;
};

/** 把角度规范化到 [0, 360) 区间。 */
export const normalizeDegrees = (degrees: number): number => {
  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

/** 把角度规范化为最近表示，范围为 [-180, 180]。 */
export const normalizeSignedDegrees = (degrees: number): number => {
  const normalized = normalizeDegrees(degrees);
  return normalized > 180 ? normalized - 360 : normalized;
};

/**
 * 规范化起止角：保证 start <= end <= start + 360，并给出中分角。
 *
 * @description 角度沿屏幕系（角度递增 = 顺时针）从 start 扫到 end；end < start 视为跨过 360 度。
 */
export const normalizeAngleRange = (startAngle: number, endAngle: number): AngleRange => {
  const k = Math.max(0, Math.ceil((startAngle - endAngle) / 360));
  const end = Math.min(endAngle + 360 * k, startAngle + 360);
  return { start: startAngle, end, mid: (startAngle + end) / 2 };
};

/** 调整 endAngle，使 start -> end 沿指定方向扫描且跨度不超过一整圈。 */
export const alignAngleSweep = (start: number, end: number, counterClockwise: boolean): { start: number; end: number } => {
  const sweep = end - start;
  if (sweep === 0) return { start, end: start };
  if (Math.abs(sweep) === 360) return { start, end: start + (counterClockwise ? -360 : 360) };

  const normalized = normalizeDegrees(sweep);
  const alignedSweep = counterClockwise
    ? normalized === 0
      ? -360
      : normalized - 360
    : normalized === 0
      ? 360
      : normalized;
  return { start, end: start + alignedSweep };
};
