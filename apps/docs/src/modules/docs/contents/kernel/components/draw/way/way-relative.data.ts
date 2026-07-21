/** Way 相对坐标对照使用的固定取景范围 */
export const WayRelativeViewBox = { x: -220, y: -120, width: 440, height: 240 };

/** Way 相对坐标极值与取景边缘之间保留的最小距离 */
export const WayRelativeSafetyPadding = 12;

/** Relative 对照路径的绝对起点 */
export const WayRelativeStart: [number, number] = [-160, -45];

/** Accumulate 对照路径的绝对起点 */
export const WayAccumulateStart: [number, number] = [-160, 45];

/** 两条对照路径共用的第一段偏移 */
export const WayRelativeFirstOffset: [number, number] = [60, 0];
