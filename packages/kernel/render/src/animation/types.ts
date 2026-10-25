/** cubic-bezier 控制点四元组 [x1, y1, x2, y2] */
export type CubicBezier = [number, number, number, number];

/** 缓动函数：归一化进度 t∈[0,1] → 输出进度 */
export type EasingFn = (t: number) => number;
