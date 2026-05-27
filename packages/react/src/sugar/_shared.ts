import type { PathProps } from '../kernel/Path';

/**
 * Shared visual props for sugar components.
 */
export type PathVisualProps = Omit<PathProps, 'children'>;

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

/** Pick visual props from sugar props and pass them to the underlying Path. */
export const pickPathVisual = (props: object): PathVisualProps => {
  const src = props as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of PATH_VISUAL_KEYS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  return out;
};

const DEG = Math.PI / 180;

/** Point-like inputs that must be literal [x, y] coordinates. */
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
    `<${sugarName}> prop ${propName} must be a literal [x, y] coordinate. Node ids, polar coordinates, and relative coordinates are not allowed here.`,
  );
};

/** Two-point midpoint. */
export const midpoint = (
  a: [number, number],
  b: [number, number],
): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Box input for sugar shapes. */
export type ShapeBox =
  | {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      origin: [number, number];
      width: number;
      height: number;
    };

/** Box expansion / contraction controls. */
export type BoxAdjustmentProps = {
  inset?: number;
  outset?: number;
};

/** Normalized box coordinates. */
export type NormalizedShapeBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Convert a box object into normalized edges. */
export const normalizeShapeBox = (
  value: ShapeBox,
  sugarName: string,
  propName: string,
): NormalizedShapeBox => {
  const origin: [number, number] =
    'origin' in value ? requireXY(value.origin, sugarName, `${propName}.origin`) : [value.x, value.y];
  if (!Number.isFinite(value.width) || value.width <= 0 || !Number.isFinite(value.height) || value.height <= 0) {
    throw new Error(`<${sugarName}> ${propName}.width and ${propName}.height must be positive numbers`);
  }
  return {
    left: origin[0],
    top: origin[1],
    right: origin[0] + value.width,
    bottom: origin[1] + value.height,
  };
};

/** Convert two opposite corners into normalized edges. */
export const normalizeCornerBox = (
  corner1: [number, number],
  corner2: [number, number],
): NormalizedShapeBox => ({
  left: Math.min(corner1[0], corner2[0]),
  top: Math.min(corner1[1], corner2[1]),
  right: Math.max(corner1[0], corner2[0]),
  bottom: Math.max(corner1[1], corner2[1]),
});

/** Apply inset / outset to a normalized box. */
export const adjustShapeBox = (
  box: NormalizedShapeBox,
  props: BoxAdjustmentProps,
  sugarName: string,
): NormalizedShapeBox => {
  const { inset, outset } = props;
  if (inset !== undefined && outset !== undefined) {
    throw new Error(`<${sugarName}> cannot accept inset and outset at the same time`);
  }
  const delta = outset ?? (inset !== undefined ? -inset : 0);
  if (!Number.isFinite(delta)) {
    throw new Error(`<${sugarName}> inset / outset must be finite numbers`);
  }
  const adjusted = {
    left: box.left - delta,
    top: box.top - delta,
    right: box.right + delta,
    bottom: box.bottom + delta,
  };
  if (adjusted.right <= adjusted.left || adjusted.bottom <= adjusted.top) {
    throw new Error(`<${sugarName}> inset / outset would collapse the box`);
  }
  return adjusted;
};

/** Box center. */
export const boxCenter = (box: NormalizedShapeBox): [number, number] => [
  (box.left + box.right) / 2,
  (box.top + box.bottom) / 2,
];

/** Box size. */
export const boxSize = (box: NormalizedShapeBox): [number, number] => [
  box.right - box.left,
  box.bottom - box.top,
];

/** Polar angle to Cartesian point for an axis-aligned ellipse/circle. */
export const polarXY = (
  center: [number, number],
  radiusX: number,
  radiusY: number,
  angleDeg: number,
): [number, number] => [
  center[0] + Math.cos(angleDeg * DEG) * radiusX,
  center[1] + Math.sin(angleDeg * DEG) * radiusY,
];

/** Regular polygon vertices on an axis-aligned ellipse. */
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

/** Star vertices on a circle. */
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

/** Angle inputs shared by circle / ellipse / arc sugars. */
export type AngleInput = {
  startAngle?: number;
  endAngle?: number;
  sweepAngle?: number;
};

/** Resolve a two-angle specification. */
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
      throw new Error(`<${sugarName}> requires angles: provide any two of startAngle / endAngle / sweepAngle`);
    }
    return undefined;
  }
  if (given !== 2) {
    throw new Error(
      `<${sugarName}> angle inputs must provide exactly two of startAngle / endAngle / sweepAngle; got ${given}`,
    );
  }
  if (startAngle !== undefined && endAngle !== undefined) return { startAngle, endAngle };
  if (startAngle !== undefined && sweepAngle !== undefined) {
    return { startAngle, endAngle: startAngle + sweepAngle };
  }
  return { startAngle: (endAngle as number) - (sweepAngle as number), endAngle: endAngle as number };
};
