import type { PathProps } from '../kernel/Path';

/**
 * 形状 sugar 共享的 Path 视觉 prop（= PathProps 去掉 children）
 * @description 公开类型——用户写自定义形状 sugar 时可 `...rest` 透传全部视觉字段，与内置 6 sugar 共用同一面
 */
export type PathVisualProps = Omit<PathProps, 'children'>;

/** Path 视觉字段名清单；`satisfies` 与 PathVisualProps 互锁（漏键 / 错字编译期报错） */
const PATH_VISUAL_KEYS = [
  'color',
  'stroke',
  'strokeWidth',
  'dashPattern',
  'lineCap',
  'lineJoin',
  'thickness',
  'arrow',
  'arrowDetail',
  'fill',
  'fillRule',
  'opacity',
  'fillOpacity',
  'drawOpacity',
  'zIndex',
] as const satisfies ReadonlyArray<keyof PathVisualProps>;

/** 从 sugar props 里挑出 Path 视觉字段（透传给底层 `<Path>`），忽略形状专属字段 */
export const pickPathVisual = (props: object): PathVisualProps => {
  const src = props as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of PATH_VISUAL_KEYS) {
    if (src[k] !== undefined) out[k] = src[k];
  }
  return out;
};

const DEG = Math.PI / 180;

/**
 * 可计算形态的点位守卫：只接 literal 笛卡尔 `[x, y]`
 * @description sugar 内无编译期坐标，凡需算 midpoint / bbox / arcStart 的形态，点位传 node id / 极坐标 / 相对坐标都明确报错（不静默兜底）
 */
export const requireXY = (
  value: unknown,
  sugarName: string,
  propName: string,
): [number, number] => {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [value[0], value[1]];
  }
  throw new Error(
    `<${sugarName}> 的 ${propName} 需 literal 笛卡尔 [x, y]——该形态要在组件内算坐标，不能用 node id / 极坐标 / 相对坐标`,
  );
};

/** 两点中点 */
export const midpoint = (
  a: [number, number],
  b: [number, number],
): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** 极坐标 → 笛卡尔：center + 半轴 (rx, ry) + 角度°（y-down，与 core arc 同约定；正圆用 rx=ry） */
export const polarXY = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): [number, number] => [
  center[0] + Math.cos(angleDeg * DEG) * radiusX,
  center[1] + Math.sin(angleDeg * DEG) * radiusY,
];

/** 正多边形顶点：center + 外接半轴 (rx, ry) + 边数 + 起始角°；按角度递增依次排布（共用 polarXY 约定） */
export const regularPolygonVertices = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  sides: number,
  rotateDeg: number,
): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let k = 0; k < sides; k++) {
    out.push(polarXY(center, radiusX, radiusY, rotateDeg + (k * 360) / sides));
  }
  return out;
};

/** 星形顶点：2·points 个，交替外 / 内半径（正圆星，rx=ry） */
export const starVertices = (
  center: [number, number],
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotateDeg: number,
): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  const stepDeg = 360 / (points * 2);
  for (let k = 0; k < points * 2; k++) {
    const r = k % 2 === 0 ? outerRadius : innerRadius;
    out.push(polarXY(center, r, r, rotateDeg + k * stepDeg));
  }
  return out;
};

/** 角度三键输入（start / end / sweep 求二） */
export type AngleInput = {
  startAngle?: number;
  endAngle?: number;
  sweepAngle?: number;
};

/**
 * 角度三键（startAngle / endAngle / sweepAngle）求二 → `{ startAngle, endAngle }`
 * @description 全缺：`required` 为 false 时返回 undefined（整形），true 时报错；恰给两个：解析第三个；给 1 / 3 个：报错
 */
export const resolveAngles = (
  input: AngleInput,
  sugarName: string,
  required = false,
): { startAngle: number; endAngle: number } | undefined => {
  const { startAngle, endAngle, sweepAngle } = input;
  const given =
    (startAngle !== undefined ? 1 : 0) +
    (endAngle !== undefined ? 1 : 0) +
    (sweepAngle !== undefined ? 1 : 0);
  if (given === 0) {
    if (required) {
      throw new Error(
        `<${sugarName}> 需给角度（startAngle / endAngle / sweepAngle 三选二）`,
      );
    }
    return undefined;
  }
  if (given !== 2) {
    throw new Error(
      `<${sugarName}> 角度三键（startAngle / endAngle / sweepAngle）须恰好给两个，当前给了 ${given} 个`,
    );
  }
  if (startAngle !== undefined && endAngle !== undefined) {
    return { startAngle, endAngle };
  }
  if (startAngle !== undefined && sweepAngle !== undefined) {
    return { startAngle, endAngle: startAngle + sweepAngle };
  }
  // endAngle + sweepAngle
  return { startAngle: (endAngle as number) - (sweepAngle as number), endAngle: endAngle as number };
};
