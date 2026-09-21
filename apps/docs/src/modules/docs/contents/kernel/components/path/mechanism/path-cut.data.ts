import type { CurveSegment } from '@retikz/math';
import { curve } from '@retikz/math';

/** 三幅图共用的二次曲线；所有长度与切片复用 Math 的公开实现 */
export const cutCurve = {
  kind: 'quadraticBezier',
  from: [0, 0],
  control: [90, -100],
  to: [180, 0],
} satisfies CurveSegment;
/** 示意用已测文字边界：48 × 20；gap 6，strokeWidth 2 */
export const cutLabel = { width: 48, height: 20, gap: 6, strokeWidth: 2 };
/** 整段曲线的近似长度 */
export const cutLength = curve.approximateLength(cutCurve, { sampleCount: 32 });
/** 本例标签所在的曲线参数中点 */
export const cutCenter = curve.sampleAt(cutCurve, 0.5).point;
/** 标签所在点的累计路径距离 */
export const cutDistance = curve.approximateLength(curve.slice(cutCurve, 0, 0.5), { sampleCount: 16 });
/** 文字投影半宽加间隙与半线宽 */
export const cutHalfWidth = cutLabel.width / 2 + cutLabel.gap + cutLabel.strokeWidth / 2;
/** 移除区间的起始路径距离 */
export const cutStart = cutDistance - cutHalfWidth;
/** 移除区间的结束路径距离 */
export const cutEnd = cutDistance + cutHalfWidth;
/** 起始距离对应的曲线参数 */
export const cutStartParameter = curve.parameterAtDistance(cutCurve, cutStart, {
  sampleCount: 32,
  totalLength: cutLength,
  bisectionSteps: 32,
});
/** 结束距离对应的曲线参数 */
export const cutEndParameter = curve.parameterAtDistance(cutCurve, cutEnd, {
  sampleCount: 32,
  totalLength: cutLength,
  bisectionSteps: 32,
});
/** 断口之前的保形子曲线 */
export const cutBefore = curve.slice(cutCurve, 0, cutStartParameter);
/** 断口对应的保形子曲线 */
export const cutRemoved = curve.slice(cutCurve, cutStartParameter, cutEndParameter);
/** 断口之后的保形子曲线 */
export const cutAfter = curve.slice(cutCurve, cutEndParameter, 1);
/** 数值仅在展示时取整，绘图保留原精度 */
export const cutNumber = (value: number): string => value.toFixed(1);
