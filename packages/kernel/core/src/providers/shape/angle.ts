/** arc / sector provider 共用的角度约定起止角。 */
export type AngleRange = {
  /** 规范化后的起始角（度），等于原始 startAngle。 */
  start: number;
  /** 规范化后的终止角（度），小于 start 时已加 360 度。 */
  end: number;
  /** 起止角中分角（度）。 */
  mid: number;
};

/**
 * 规范化起止角：保证 start <= end <= start + 360，并给出中分角。
 *
 * @description 角度沿屏幕系（角度递增 = 顺时针）从 start 扫到 end；end < start 视为跨过 360 度。
 * @remarks 使用闭式计算而不是循环，避免巨型角度让循环退化或浮点加法停滞；跨度超过整圆时钳到 360 度，
 *   防止下游枚举大量轴向极值点。
 */
export const normalizeAngleRange = (startAngle: number, endAngle: number): AngleRange => {
  const k = Math.max(0, Math.ceil((startAngle - endAngle) / 360));
  const end = Math.min(endAngle + 360 * k, startAngle + 360);
  return { start: startAngle, end, mid: (startAngle + end) / 2 };
};
