import type { InspectionPrimitive, InspectionRectPrimitive } from '@retikz/core';

type InspectionTone = InspectionPrimitive['tone'];
type InspectionFillPattern = Extract<InspectionRectPrimitive, { presentation: 'fill' }>['fillPattern'];

type InspectionRect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** 单条 inspection hatch 的 rect 内线段 */
export type InspectionHatchSegment = Readonly<{ x1: number; y1: number; x2: number; y2: number }>;

/** 多个 inspection occurrence 循环使用的通用色板 */
export const InspectionPalette = Object.freeze([
  '#2563eb',
  '#7c3aed',
  '#c026d3',
  '#db2777',
  '#ea580c',
  '#a16207',
  '#16a34a',
  '#0f766e',
  '#0891b2',
]);

/** Inspection warning 独立使用的颜色 */
export const InspectionWarningColor = '#dc2626';

/** Inspection hatch 在 user units 中的 canonical 间距 */
export const InspectionHatchPitch = 12;

/** Inspection hatch 在 user units 中的 canonical 线宽 */
export const InspectionHatchStrokeWidth = 1;

/** 按 occurrence color scope 或 warning tone 解析共享颜色 */
export const resolveInspectionColor = (colorScope: number, tone: InspectionTone): string =>
  tone === 'warning' ? InspectionWarningColor : InspectionPalette[colorScope % InspectionPalette.length];

/** 按 pattern 与 primitive multiplier 解析 fill 两个 alpha 通道 */
export const resolveInspectionFillAlphas = (
  pattern: InspectionFillPattern,
  opacity = 1,
): Readonly<{ fill: number; hatch: number }> =>
  pattern === 'solid'
    ? Object.freeze({ fill: 0.14 * opacity, hatch: 0 })
    : Object.freeze({ fill: 0, hatch: 0.55 * opacity });

type Point = Readonly<{ x: number; y: number }>;

const InspectionHatchStrokeInset = InspectionHatchStrokeWidth / 2;

const inRange = (value: number, min: number, max: number): boolean => value >= min - 1e-9 && value <= max + 1e-9;

const uniquePoints = (points: ReadonlyArray<Point>): ReadonlyArray<Point> => {
  const unique: Array<Point> = [];
  points.forEach(point => {
    if (!unique.some(candidate => Math.abs(candidate.x - point.x) < 1e-9 && Math.abs(candidate.y - point.y) < 1e-9)) {
      unique.push(point);
    }
  });
  return unique;
};

/** 在保留全局 pitch 相位的同时生成不会让 1 user unit 宽的 stroke 越出 rect 的对角线 */
const diagonalSegments = (
  rect: InspectionRect,
  direction: 'forward-diagonal' | 'backward-diagonal',
): ReadonlyArray<InspectionHatchSegment> => {
  if (rect.width <= InspectionHatchStrokeInset * 2 || rect.height <= InspectionHatchStrokeInset * 2) {
    return Object.freeze([]);
  }
  const xMin = rect.x + InspectionHatchStrokeInset;
  const xMax = rect.x + rect.width - InspectionHatchStrokeInset;
  const yMin = rect.y + InspectionHatchStrokeInset;
  const yMax = rect.y + rect.height - InspectionHatchStrokeInset;
  const forward = direction === 'forward-diagonal';
  const interceptMin = forward ? xMin + yMin : yMin - xMax;
  const interceptMax = forward ? xMax + yMax : yMax - xMin;
  const first = Math.ceil(interceptMin / InspectionHatchPitch) * InspectionHatchPitch;
  const segments: Array<InspectionHatchSegment> = [];
  for (let intercept = first; intercept <= interceptMax + 1e-9; intercept += InspectionHatchPitch) {
    const yAtMinX = forward ? -xMin + intercept : xMin + intercept;
    const yAtMaxX = forward ? -xMax + intercept : xMax + intercept;
    const xAtMinY = forward ? intercept - yMin : yMin - intercept;
    const xAtMaxY = forward ? intercept - yMax : yMax - intercept;
    const points = [
      ...uniquePoints([
        ...(inRange(yAtMinX, yMin, yMax) ? [{ x: xMin, y: yAtMinX }] : []),
        ...(inRange(yAtMaxX, yMin, yMax) ? [{ x: xMax, y: yAtMaxX }] : []),
        ...(inRange(xAtMinY, xMin, xMax) ? [{ x: xAtMinY, y: yMin }] : []),
        ...(inRange(xAtMaxY, xMin, xMax) ? [{ x: xAtMaxY, y: yMax }] : []),
      ]),
    ].sort((left, right) => left.x - right.x || left.y - right.y);
    if (points.length < 2) continue;
    const start = points[0];
    const end = points.at(-1)!;
    if (Math.abs(start.x - end.x) < 1e-9 && Math.abs(start.y - end.y) < 1e-9) continue;
    segments.push(Object.freeze({ x1: start.x, y1: start.y, x2: end.x, y2: end.y }));
  }
  return Object.freeze(segments);
};

/** 为 rect 生成已经裁到边界内的 canonical hatch segments */
export const createInspectionHatchSegments = (
  rect: InspectionRect,
  pattern: InspectionFillPattern,
): ReadonlyArray<InspectionHatchSegment> => {
  if (pattern === 'solid') return Object.freeze([]);
  const forward = diagonalSegments(rect, 'forward-diagonal');
  if (pattern === 'forward-diagonal') return forward;
  const backward = diagonalSegments(rect, 'backward-diagonal');
  if (pattern === 'backward-diagonal') return backward;
  return Object.freeze([...forward, ...backward]);
};
