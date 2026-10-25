import type { IRChild, IRCoordinate, IRNodeLabel, IRPath, IRScope, IRStep } from '@retikz/core';
import { mergeGraphicStyle } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { compareRowsByFieldPath, inferCategoryDomain, resolveFieldPath } from '@retikz/data';

import type {
  ChannelValueResolver,
  CoordinateFrame,
  FieldCollector,
  MarkChannels,
  MarkLoweringContext,
  MarkProvenance,
} from '../../../contract';
import { seriesPathMeta, slug, channelField } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotMark, IRPlotPathClosure, IRPlotPathMark } from '../../../schemas';
import {
  PathClosureKind,
  PathCurve,
  PathMarkSchema,
  BuiltinPlotMark,
  PlotPathConnectNullsStyleSchema,
} from '../../../schemas';
import type { PolarVertex } from '../../coordinate';
import {
  densifyPolarSegments,
  isCartesianCoordinateFrame,
  isGenericCoordinateFrame,
  isPolarCoordinateFrame,
} from '../../coordinate';
import { pointsToSteps } from '../shared';
import type { MarkPaint } from '../shared';
import {
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectCommonEncodingFields,
  collectPathChannelFields,
  DEFAULT_FILL,
  failLoudMessage,
  LINE_STROKE_WIDTH,
  pathChannelKinds,
  resolveGeometryMarkLabels,
  roleAnchor,
  roleValue,
  mapMarkRoles,
  mappedRoleValue,
} from '../shared';
import type { MarkDefinition } from '../types';
import { lowerPathInstances } from './path-instances';

/**
 * 取一行的位置通道值 → [xValue, yValue]（坐标系无关；投影交给 frame.project，frame 把 x/y 重解释为对应角色）
 * @description x/y 是唯一位置通道（坐标系决定其含义）
 */
export const resolveRolePosition = (mark: IRPlotPathMark, row: ExternalRow): [unknown, unknown] => [
  roleValue(mark, 'x', row),
  roleValue(mark, 'y', row),
];

// PathMark 的 curve 是图表层连接方式；这里统一下沉为 core Path 已支持的 step 序列
const cubicStep = (
  control1: [number, number],
  control2: [number, number],
  to: [number, number],
): Extract<IRStep, { kind: 'cubic' }> => ({ type: 'step', kind: 'cubic', control1, control2, to });

const withClosingPoint = (points: ReadonlyArray<[number, number]>, closed: boolean): Array<[number, number]> =>
  closed ? [...points, points[0]] : [...points];

const pointsToStepCurveSteps = (
  points: ReadonlyArray<[number, number]>,
  closed: boolean,
  curve: PathCurve,
): Array<IRStep> | null => {
  const pathPoints = withClosingPoint(points, closed);
  if (pathPoints.length < 2) return null;

  const steps: Array<IRStep> = [{ type: 'step', kind: 'move', to: pathPoints[0] }];

  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const next = pathPoints[i];
    if (curve === PathCurve.StepBefore) {
      steps.push({ type: 'step', kind: 'line', to: [prev[0], next[1]] });
    } else if (curve === PathCurve.StepAfter) {
      steps.push({ type: 'step', kind: 'line', to: [next[0], prev[1]] });
    } else {
      const midX = (prev[0] + next[0]) / 2;
      steps.push({ type: 'step', kind: 'line', to: [midX, prev[1]] });
      steps.push({ type: 'step', kind: 'line', to: [midX, next[1]] });
    }

    steps.push({ type: 'step', kind: 'line', to: next });
  }

  if (closed) steps.push({ type: 'step', kind: 'cycle' });

  return steps;
};

const cardinalSegments = (
  points: ReadonlyArray<[number, number]>,
  tension: number,
): Array<Extract<IRStep, { kind: 'cubic' }>> => {
  const segments: Array<Extract<IRStep, { kind: 'cubic' }>> = [];
  const k = (1 - tension) / 6;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    segments.push(
      cubicStep(
        [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k],
        [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k],
        p2,
      ),
    );
  }

  return segments;
};

const basisSegments = (points: ReadonlyArray<[number, number]>): Array<Extract<IRStep, { kind: 'cubic' }>> => {
  if (points.length < 3) return cardinalSegments(points, 0);

  const segments: Array<Extract<IRStep, { kind: 'cubic' }>> = [];
  let p0 = points[0];
  let p1 = points[1];
  segments.push(
    cubicStep(
      [(2 * p0[0] + p1[0]) / 3, (2 * p0[1] + p1[1]) / 3],
      [(p0[0] + 2 * p1[0]) / 3, (p0[1] + 2 * p1[1]) / 3],
      [(p0[0] + 4 * p1[0] + points[2][0]) / 6, (p0[1] + 4 * p1[1] + points[2][1]) / 6],
    ),
  );

  for (let i = 2; i < points.length - 1; i++) {
    const p2 = points[i];
    segments.push(
      cubicStep(
        [(2 * p0[0] + p1[0]) / 3, (2 * p0[1] + p1[1]) / 3],
        [(p0[0] + 2 * p1[0]) / 3, (p0[1] + 2 * p1[1]) / 3],
        [(p0[0] + 4 * p1[0] + p2[0]) / 6, (p0[1] + 4 * p1[1] + p2[1]) / 6],
      ),
    );
    p0 = p1;
    p1 = p2;
  }

  const last = points[points.length - 1];
  segments.push(
    cubicStep(
      [(2 * p0[0] + p1[0]) / 3, (2 * p0[1] + p1[1]) / 3],
      [(p0[0] + 2 * p1[0]) / 3, (p0[1] + 2 * p1[1]) / 3],
      last,
    ),
  );

  return segments;
};

const monotoneSlopes = (values: Array<number>, positions: Array<number>): Array<number> => {
  const n = values.length;
  const slopes = new Array<number>(n).fill(0);
  const deltas: Array<number> = [];

  for (let i = 0; i < n - 1; i++) {
    const dx = positions[i + 1] - positions[i];
    deltas.push(dx === 0 ? 0 : (values[i + 1] - values[i]) / dx);
  }

  slopes[0] = deltas[0] ?? 0;
  slopes[n - 1] = deltas[n - 2] ?? 0;

  for (let i = 1; i < n - 1; i++) slopes[i] = deltas[i - 1] * deltas[i] <= 0 ? 0 : (deltas[i - 1] + deltas[i]) / 2;

  for (let i = 0; i < n - 1; i++) {
    const delta = deltas[i];
    if (delta === 0) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
      continue;
    }

    const a = slopes[i] / delta;
    const b = slopes[i + 1] / delta;
    const sum = a * a + b * b;
    if (sum > 9) {
      const tau = 3 / Math.sqrt(sum);
      slopes[i] = tau * a * delta;
      slopes[i + 1] = tau * b * delta;
    }
  }

  return slopes;
};

const monotoneSegments = (
  points: ReadonlyArray<[number, number]>,
  dimension: 'x' | 'y',
): Array<Extract<IRStep, { kind: 'cubic' }>> => {
  const primary = points.map(point => (dimension === 'x' ? point[0] : point[1]));
  const secondary = points.map(point => (dimension === 'x' ? point[1] : point[0]));
  const slopes = monotoneSlopes(secondary, primary);
  const segments: Array<Extract<IRStep, { kind: 'cubic' }>> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const d = (primary[i + 1] - primary[i]) / 3;
    const c1Primary = primary[i] + d;
    const c2Primary = primary[i + 1] - d;
    const c1Secondary = secondary[i] + slopes[i] * d;
    const c2Secondary = secondary[i + 1] - slopes[i + 1] * d;
    const control1: [number, number] = dimension === 'x' ? [c1Primary, c1Secondary] : [c1Secondary, c1Primary];
    const control2: [number, number] = dimension === 'x' ? [c2Primary, c2Secondary] : [c2Secondary, c2Primary];
    segments.push(cubicStep(control1, control2, points[i + 1]));
  }

  return segments;
};

const naturalSecondDerivatives = (values: Array<number>, positions: Array<number>): Array<number> => {
  const n = values.length;
  const second = new Array<number>(n).fill(0);
  const temp = new Array<number>(n).fill(0);

  for (let i = 1; i < n - 1; i++) {
    const h0 = positions[i] - positions[i - 1];
    const h1 = positions[i + 1] - positions[i];
    if (h0 === 0 || h1 === 0) continue;

    const sig = h0 / (h0 + h1);
    const p = sig * second[i - 1] + 2;
    second[i] = (sig - 1) / p;
    temp[i] =
      ((6 * ((values[i + 1] - values[i]) / h1 - (values[i] - values[i - 1]) / h0)) / (h0 + h1) - sig * temp[i - 1]) / p;
  }

  for (let k = n - 2; k >= 0; k--) second[k] = second[k] * second[k + 1] + temp[k];

  return second;
};

const naturalSegments = (points: ReadonlyArray<[number, number]>): Array<Extract<IRStep, { kind: 'cubic' }>> => {
  const t = points.map((_, index) => index);
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const secondX = naturalSecondDerivatives(xs, t);
  const secondY = naturalSecondDerivatives(ys, t);
  const segments: Array<Extract<IRStep, { kind: 'cubic' }>> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const h = t[i + 1] - t[i];
    segments.push(
      cubicStep(
        [
          xs[i] + (h * (xs[i + 1] - xs[i])) / 3 - (h * h * (2 * secondX[i] + secondX[i + 1])) / 18,
          ys[i] + (h * (ys[i + 1] - ys[i])) / 3 - (h * h * (2 * secondY[i] + secondY[i + 1])) / 18,
        ],
        [
          xs[i + 1] - (h * (xs[i + 1] - xs[i])) / 3 + (h * h * (secondX[i] + 2 * secondX[i + 1])) / 18,
          ys[i + 1] - (h * (ys[i + 1] - ys[i])) / 3 + (h * h * (secondY[i] + 2 * secondY[i + 1])) / 18,
        ],
        points[i + 1],
      ),
    );
  }

  return segments;
};

const pointsToCurveSteps = (
  points: ReadonlyArray<[number, number]>,
  closed: boolean,
  curve: PathCurve = PathCurve.Linear,
): Array<IRStep> | null => {
  if (curve === PathCurve.Linear) return pointsToSteps(points, closed);
  if (curve === PathCurve.Step || curve === PathCurve.StepBefore || curve === PathCurve.StepAfter) {
    return pointsToStepCurveSteps(points, closed, curve);
  }

  const pathPoints = withClosingPoint(points, closed);
  if (pathPoints.length < 2) return null;
  if (curve === PathCurve.CatmullRom) {
    const steps: Array<IRStep> = [
      { type: 'step', kind: 'move', to: pathPoints[0] },
      { type: 'step', kind: 'smooth', points: pathPoints.slice(1), tension: 1 },
    ];
    if (closed) steps.push({ type: 'step', kind: 'cycle' });

    return steps;
  }

  const segments =
    curve === PathCurve.Basis
      ? basisSegments(pathPoints)
      : curve === PathCurve.MonotoneX
        ? monotoneSegments(pathPoints, 'x')
        : curve === PathCurve.MonotoneY
          ? monotoneSegments(pathPoints, 'y')
          : curve === PathCurve.Natural
            ? naturalSegments(pathPoints)
            : cardinalSegments(pathPoints, 0);
  if (segments.length === 0) return null;

  const steps: Array<IRStep> = [{ type: 'step', kind: 'move', to: pathPoints[0] }, ...segments];
  if (closed) steps.push({ type: 'step', kind: 'cycle' });

  return steps;
};

/** 按 order / 数据序排好一组行（path 共用连接顺序） */
const effectivePathCurve = (curve: PathCurve | undefined, frame: CoordinateFrame): PathCurve => {
  if (isPolarCoordinateFrame(frame) && (curve === PathCurve.MonotoneX || curve === PathCurve.MonotoneY)) {
    return PathCurve.Linear;
  }

  return curve ?? PathCurve.Linear;
};

/** 按图元 order 字段稳定排序数据行 */
export const orderRows = (rows: Array<ExternalRow>, order: string | undefined): Array<ExternalRow> =>
  order ? [...rows].sort((a, b) => compareRowsByFieldPath(a, b, order)) : rows;

/**
 * 把一组有序行投影成上沿屏幕点（坐标系无关）
 * @description cartesian / polar 分类角轴 / closed 走弦（顶点直连）；polar 连续角轴段内采样弯弧
 */
export const buildOutlinePoints = (
  mark: IRPlotPathMark,
  ordered: Array<ExternalRow>,
  frame: CoordinateFrame,
  closed: boolean,
): Array<[number, number]> => {
  if (isPolarCoordinateFrame(frame) && (mark.properties?.interpolation ?? frame.interpolation) === 'polar') {
    const vertices = ordered
      .map(row => {
        const mapped = mapMarkRoles(mark, resolveRolePosition(mark, row), frame);
        return mapped === null ? null : { theta: mapped[0], radius: mapped[1] };
      })
      .filter((vertex): vertex is PolarVertex => vertex !== null);
    return densifyPolarSegments(frame, vertices, { closed });
  }

  return ordered.map(row => roleAnchor(mark, row, frame)).filter((point): point is [number, number] => point !== null);
};

const ZERO_BASELINE = 0;

const pathDefaultBaseline = (frame: CoordinateFrame): number => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) return ZERO_BASELINE;

  const numericDomain = frame.secondary
    .domain()
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (numericDomain.length < 2) return ZERO_BASELINE;

  const min = Math.min(...numericDomain);
  const max = Math.max(...numericDomain);
  if (min <= ZERO_BASELINE && max >= ZERO_BASELINE) return ZERO_BASELINE;

  return Math.abs(min - ZERO_BASELINE) <= Math.abs(max - ZERO_BASELINE) ? min : max;
};

const pathClosureOf = (mark: IRPlotPathMark): IRPlotPathClosure | undefined => mark.properties?.closure;

type PathRowSegment = Array<ExternalRow>;

type PathStepSegment = { rows: PathRowSegment; steps: Array<IRStep>; bridgesNulls?: boolean };

const projectableTopPoint = (mark: IRPlotPathMark, row: ExternalRow, frame: CoordinateFrame): boolean =>
  roleAnchor(mark, row, frame) !== null;

/** 闭合基线仅替换次轴，主轴仍使用相同的字段或最终边缘映射 */
const projectBaselinePoint = (
  mark: IRPlotPathMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  baseline: unknown,
): [number, number] | null => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) return null;
  const mapped = [mappedRoleValue(mark, 'x', row, frame.primary), frame.secondary.coordinate(baseline)];
  return mapped.every(Number.isFinite) ? frame.projectMappedRoles(mapped) : null;
};

/** 读取堆叠闭合所需的逐行基线字段 */
export const pathBaselineField = (mark: IRPlotPathMark): string => {
  const field = mark.encodings.closure?.baseline;
  if (field === undefined) throw new RetikzPlotError('Stack path closure requires encodings.closure.baseline');
  return field;
};

const projectableClosurePoint = (
  mark: IRPlotPathMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  closure: IRPlotPathClosure,
): boolean => {
  if (!projectableTopPoint(mark, row, frame)) return false;

  if (closure.kind === PathClosureKind.Baseline)
    return projectBaselinePoint(mark, row, frame, closure.baseline ?? pathDefaultBaseline(frame)) !== null;
  if (closure.kind === PathClosureKind.Stack)
    return projectBaselinePoint(mark, row, frame, resolveFieldPath(row, pathBaselineField(mark))) !== null;

  return true;
};

const splitRowsByProjectability = (
  rows: Array<ExternalRow>,
  projectable: (row: ExternalRow) => boolean,
  connectNulls: boolean,
): Array<PathRowSegment> => {
  if (connectNulls) {
    const segment = rows.filter(projectable);
    return segment.length > 0 ? [segment] : [];
  }

  const segments: Array<PathRowSegment> = [];
  let current: PathRowSegment = [];

  for (const row of rows) {
    if (projectable(row)) {
      current.push(row);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length > 0) segments.push(current);

  return segments;
};

const pathRowSegments = (
  mark: IRPlotPathMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  closure: IRPlotPathClosure | undefined,
): Array<PathRowSegment> => {
  const ordered = orderRows(rows, mark.encodings.order);
  const connectNulls = mark.properties?.connectNulls !== undefined && mark.properties.connectNulls !== false;
  const projectable = (row: ExternalRow): boolean =>
    closure === undefined ? projectableTopPoint(mark, row, frame) : projectableClosurePoint(mark, row, frame, closure);

  return splitRowsByProjectability(ordered, projectable, connectNulls);
};

const buildConstantBaselinePoints = (
  mark: IRPlotPathMark,
  ordered: Array<ExternalRow>,
  frame: CoordinateFrame,
  baseline: number,
): Array<[number, number]> =>
  ordered
    .map(row => projectBaselinePoint(mark, row, frame, baseline))
    .filter((point): point is [number, number] => point !== null)
    .reverse();

const buildStackBaselinePoints = (
  mark: IRPlotPathMark,
  ordered: Array<ExternalRow>,
  frame: CoordinateFrame,
  baselineField: string,
): Array<[number, number]> =>
  ordered
    .map(row => projectBaselinePoint(mark, row, frame, resolveFieldPath(row, baselineField)))
    .filter((point): point is [number, number] => point !== null)
    .reverse();

const buildClosureReturnPoints = (
  mark: IRPlotPathMark,
  ordered: Array<ExternalRow>,
  frame: CoordinateFrame,
  closure: IRPlotPathClosure,
): Array<[number, number]> => {
  if (closure.kind === PathClosureKind.Baseline) {
    return buildConstantBaselinePoints(mark, ordered, frame, closure.baseline ?? pathDefaultBaseline(frame));
  }

  if (closure.kind === PathClosureKind.Stack) {
    return buildStackBaselinePoints(mark, ordered, frame, pathBaselineField(mark));
  }

  return [];
};

const buildLineStepSegments = (
  mark: IRPlotPathMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  closed: boolean,
): Array<PathStepSegment> => {
  const connectNulls = mark.properties?.connectNulls !== undefined && mark.properties.connectNulls !== false;
  if (!closed && connectNulls) {
    const runs = splitRowsByProjectability(
      orderRows(rows, mark.encodings.order),
      row => projectableTopPoint(mark, row, frame),
      false,
    );
    const segments: Array<PathStepSegment> = [];

    for (const [index, run] of runs.entries()) {
      if (index > 0) {
        const previous = runs[index - 1];
        const bridgeRows = [previous[previous.length - 1], run[0]];
        const steps = pointsToCurveSteps(
          buildOutlinePoints(mark, bridgeRows, frame, false),
          false,
          effectivePathCurve(mark.properties?.curve, frame),
        );
        if (steps !== null) segments.push({ rows: bridgeRows, steps, bridgesNulls: true });
      }

      const steps = pointsToCurveSteps(
        buildOutlinePoints(mark, run, frame, false),
        false,
        effectivePathCurve(mark.properties?.curve, frame),
      );
      if (steps !== null) segments.push({ rows: run, steps });
    }

    return segments;
  }

  return pathRowSegments(mark, rows, frame, undefined).flatMap(segmentRows => {
    const steps = pointsToCurveSteps(
      buildOutlinePoints(mark, segmentRows, frame, closed),
      closed,
      effectivePathCurve(mark.properties?.curve, frame),
    );
    return steps === null ? [] : [{ rows: segmentRows, steps }];
  });
};

const defaultNullConnectionStyle = PlotPathConnectNullsStyleSchema.parse({});

/** 通道描边生效后，仅覆盖跨缺值连接段 */
const applyNullConnectionStyle = (path: IRPath, segment: PathStepSegment, mark: IRPlotPathMark): IRPath => {
  if (!segment.bridgesNulls) return path;
  const overrides =
    typeof mark.properties?.connectNulls === 'object' ? mark.properties.connectNulls : defaultNullConnectionStyle;
  const { strokeOpacity, ...styleOverrides } = { ...defaultNullConnectionStyle, ...overrides };
  return {
    ...path,
    style: mergeGraphicStyle(
      path.style,
      styleOverrides,
      strokeOpacity === undefined ? {} : { opacity: { stroke: strokeOpacity } },
    ),
  };
};

const returnCurveSteps = (points: ReadonlyArray<[number, number]>, curve: PathCurve): Array<IRStep> | null => {
  const steps = pointsToCurveSteps(points, false, curve);
  if (steps === null) return null;

  const [, ...rest] = steps;

  return [{ type: 'step', kind: 'line', to: points[0] }, ...rest];
};

const buildClosureStepSegment = (
  mark: IRPlotPathMark,
  segmentRows: PathRowSegment,
  frame: CoordinateFrame,
  closure: IRPlotPathClosure,
  closed: boolean,
): PathStepSegment | null => {
  if (closure.kind === PathClosureKind.Cycle) {
    const steps = pointsToCurveSteps(
      buildOutlinePoints(mark, segmentRows, frame, true),
      true,
      effectivePathCurve(mark.properties?.curve, frame),
    );
    return steps === null ? null : { rows: segmentRows, steps };
  }

  const top = buildOutlinePoints(mark, segmentRows, frame, closed);
  const bottom = buildClosureReturnPoints(mark, segmentRows, frame, closure);
  if (top.length < 2 || bottom.length < 2) return null;

  const topLoop = closed ? [...top, top[0]] : top;
  const bottomLoop = closed ? [bottom[bottom.length - 1], ...bottom] : bottom;
  const curve = effectivePathCurve(mark.properties?.curve, frame);
  const topSteps = pointsToCurveSteps(topLoop, false, curve);
  const bottomSteps = returnCurveSteps(bottomLoop, curve);
  if (!topSteps || !bottomSteps) return null;

  return {
    rows: segmentRows,
    steps: [...topSteps, ...bottomSteps, { type: 'step', kind: 'cycle' }],
  };
};

const buildClosureStepSegments = (
  mark: IRPlotPathMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  closure: IRPlotPathClosure,
  closed: boolean,
): Array<PathStepSegment> =>
  pathRowSegments(mark, rows, frame, closure).flatMap(segmentRows => {
    const segment = buildClosureStepSegment(mark, segmentRows, frame, closure, closed);
    return segment === null ? [] : [segment];
  });

/** 多系列 series 拆分通用：每条 series 一个 Scope，内部承载一个或多个 Path segment */
export type SeriesPathBuilder = (seriesRows: Array<ExternalRow>) => Array<PathStepSegment>;

/** path child 的可变形态（series 多段时按需补 segment id），直接复用 core IRPath 属性面 */
type IRPathChild = IRPath;

const pathMarkOptions = (mark: IRPlotPathMark): Partial<Pick<IRPath, 'marks'>> =>
  mark.properties?.marks === undefined ? {} : { marks: mark.properties.marks };

/** 按 series 分组并构造独立 scope owner */
export const buildSeriesPathScopes = (
  mark: IRPlotPathMark,
  rows: Array<ExternalRow>,
  seriesField: string,
  buildSteps: SeriesPathBuilder,
  paintOf: (seriesRows: Array<ExternalRow>) => Partial<Pick<NonNullable<IRPath['style']>, 'fill' | 'stroke'>>,
  channels: MarkChannels,
  markProvenance: MarkProvenance | undefined,
): Array<IRScope> => {
  const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
  const plotId = markProvenance?.context.plotId;
  const seenIds = markProvenance && plotId !== undefined ? new Map<string, unknown>() : undefined;
  const scopes: Array<IRScope> = [];

  for (const series of seriesValues) {
    const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
    const segments = buildSteps(seriesRows);
    const baseId = plotId === undefined ? undefined : `${plotId}.series.${slug(series)}`;
    if (baseId !== undefined && seenIds) {
      const prior = seenIds.get(baseId);
      if (prior !== undefined && prior !== series) {
        throw new RetikzPlotError(
          `lowerPlots: series values "${String(prior)}" and "${String(series)}" collide to the same series id "${baseId}"; series anchors must be unique`,
        );
      }

      seenIds.set(baseId, series);
    }

    const paths: Array<IRPath> = [];

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const row = segment.rows[0] ?? {};
      const label = resolveGeometryMarkLabels(
        mark.properties?.label,
        row,
        channelValueOf<IRNodeLabel['text']>(channels, 'label'),
        mark.encodings.label,
        channels,
      );
      const path: IRPathChild = applyPathChannelDeliveries(
        {
          type: 'path',
          ...pathMarkOptions(mark),
          style: paintOf(segment.rows),
          ...(label !== undefined ? { label } : {}),
          children: segment.steps,
        },
        mark,
        row,
        channels,
      );
      if (baseId !== undefined && segments.length > 1) {
        path.id = `${baseId}.segment.${index + 1}`;
      }

      paths.push(applyNullConnectionStyle(path, segment, mark));
    }

    if (paths.length === 0) continue;

    scopes.push({
      type: 'scope',
      ...(baseId !== undefined ? { id: baseId } : {}),
      ...(markProvenance ? { meta: seriesPathMeta(mark.type, markProvenance.markIndex, series) } : {}),
      children: paths,
    });
  }

  return scopes;
};

/** 解析 path 图元在当前通道与默认值下使用的 paint */
export const markPaintOf = (
  mark: IRPlotMark,
  channels: MarkChannels,
  channel: 'fill' | 'stroke',
  rows: Array<ExternalRow>,
  fallback?: MarkPaint,
): MarkPaint | undefined => {
  const resolver = channelValueOf<MarkPaint>(channels, channel);
  if (resolver !== undefined) return resolver(rows[0] ?? {});
  return channelDefaultOf<MarkPaint>(channels, channel) ?? fallback;
};

/**
 * 显式 series + color 字段并存时，校验 color 在每个 series 组内恒定（否则 fail-loud）
 */
const assertColorConstantWithinSeries = (rows: Array<ExternalRow>, seriesField: string, colorField: string): void => {
  const colorsBySeries = new Map<unknown, Set<unknown>>();

  for (const row of rows) {
    const seriesValue = resolveFieldPath(row, seriesField);
    const colorValue = resolveFieldPath(row, colorField);
    const set = colorsBySeries.get(seriesValue) ?? new Set<unknown>();
    set.add(colorValue);
    colorsBySeries.set(seriesValue, set);
  }

  for (const [seriesValue, colors] of colorsBySeries) {
    if (colors.size > 1) {
      throw new RetikzPlotError(
        `lowerPlots: color field "${colorField}" is not constant within series "${String(seriesValue)}"; color must be constant per series, or split by color instead of setting series`,
      );
    }
  }
};

/**
 * path mark（path）的有效 series 字段
 * @description 显式 mark.encodings.series 优先；无显式 series 但有 categorical color 字段 → 隐式按 color 拆系列。
 *   显式 series 与 color 字段并存且 color 在 series 内不恒定 → fail-loud
 */
export const pathSeriesField = (mark: IRPlotMark, rows: Array<ExternalRow>): string | undefined => {
  if (mark.type !== BuiltinPlotMark.Path) return undefined;

  const colorField = mark.encodings.color === undefined ? undefined : channelField(mark.encodings.color);
  if (mark.encodings.series) {
    if (colorField && colorField !== mark.encodings.series)
      assertColorConstantWithinSeries(rows, mark.encodings.series, colorField);
    return mark.encodings.series;
  }

  return colorField;
};

/** 折线（path mark）：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关） */
const lowerPath = (
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  if (mark.type !== BuiltinPlotMark.Path) return null;
  if (mark.properties?.interpolation !== undefined && !isPolarCoordinateFrame(frame)) {
    throw new RetikzPlotError('lowerPlots: path interpolation override is only supported under polar2D');
  }

  const closure = pathClosureOf(mark);
  const closed = mark.properties?.closed ?? isPolarCoordinateFrame(frame);
  const seriesField = pathSeriesField(mark, rows);
  const defaultStroke = markPaintOf(mark, channels, 'stroke', rows, defaultColor ?? DEFAULT_FILL) ?? DEFAULT_FILL;
  const defaultFill = markPaintOf(mark, channels, 'fill', rows, undefined);
  const filled =
    rows.some(row => {
      const fill = markPaintOf(mark, channels, 'fill', [row], undefined);
      return fill !== undefined && fill !== 'none';
    }) ||
    (defaultFill !== undefined && defaultFill !== 'none');
  if (typeof mark.properties?.connectNulls === 'object' && (closed || closure !== undefined || filled)) {
    throw new RetikzPlotError('lowerPlots: connectNulls stroke configuration requires an open unfilled path');
  }

  const lineSegments = (segmentRows: Array<ExternalRow>): Array<PathStepSegment> =>
    filled && !closed && !closure
      ? pathRowSegments(mark, segmentRows, frame, undefined).flatMap(run => {
          const steps = pointsToCurveSteps(
            buildOutlinePoints(mark, run, frame, false),
            false,
            effectivePathCurve(mark.properties?.curve, frame),
          );
          return steps === null ? [] : [{ rows: run, steps }];
        })
      : buildLineStepSegments(mark, segmentRows, frame, closed);
  if (seriesField) {
    const seriesScopes = buildSeriesPathScopes(
      mark,
      rows,
      seriesField,
      seriesRows =>
        closure ? buildClosureStepSegments(mark, seriesRows, frame, closure, closed) : lineSegments(seriesRows),
      seriesRows => {
        const fill = markPaintOf(mark, channels, 'fill', seriesRows, undefined);
        return {
          stroke:
            markPaintOf(mark, channels, 'stroke', seriesRows, colorOf?.(seriesRows[0]) ?? DEFAULT_FILL) ?? DEFAULT_FILL,
          ...(fill !== undefined ? { fill } : {}),
        };
      },
      channels,
      markProvenance,
    );
    return seriesScopes.length === 0
      ? null
      : {
          type: 'scope',
          children: seriesScopes,
          defaults: {
            path: {
              style: { strokeWidth: LINE_STROKE_WIDTH },
            },
          },
        };
  }

  const segments = closure ? buildClosureStepSegments(mark, rows, frame, closure, closed) : lineSegments(rows);
  if (segments.length === 0) return null;

  const stroke = defaultStroke;

  return {
    type: 'scope',
    children: segments.map(segment => {
      const row = segment.rows[0] ?? {};
      const fill = markPaintOf(mark, channels, 'fill', segment.rows);
      const label = resolveGeometryMarkLabels(
        mark.properties?.label,
        row,
        channelValueOf<IRNodeLabel['text']>(channels, 'label'),
        mark.encodings.label,
        channels,
      );

      return applyNullConnectionStyle(
        applyPathChannelDeliveries(
          {
            type: 'path',
            ...pathMarkOptions(mark),
            style: {
              ...(fill === undefined ? {} : { fill }),
              stroke: markPaintOf(
                mark,
                channels,
                'stroke',
                segment.rows,
                colorOf?.(row) ?? defaultColor ?? DEFAULT_FILL,
              ),
            },
            ...(label !== undefined ? { label } : {}),
            children: segment.steps,
          },
          mark,
          row,
          channels,
        ),
        segment,
        mark,
      );
    }),
    defaults: {
      path: {
        style: {
          ...(defaultFill !== undefined ? { fill: defaultFill } : {}),
          stroke,
          strokeWidth: LINE_STROKE_WIDTH,
        },
      },
    },
  };
};

/** 为 Path datum anchor 按当前 coordinate roles 投影稳定坐标 */
const pathAnchorCoordinates = (
  mark: IRPlotPathMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
): Array<IRCoordinate> => {
  if ((mark.properties?.anchorId === undefined && mark.encodings.anchorId === undefined) || ctx?.anchors === undefined)
    return [];

  const coordinates: Array<IRCoordinate> = [];
  const ordered = orderRows(rows, mark.encodings.order);

  for (let transformedIndex = 0; transformedIndex < ordered.length; transformedIndex += 1) {
    const row = ordered[transformedIndex];
    const position = roleAnchor(mark, row, frame);
    if (position === null) continue;

    const owner = {
      kind: 'row' as const,
      markType: mark.type,
      markId: mark.id,
      markIndex: ctx.markIndex,
      transformedIndex,
    };
    const identity = ctx.anchors.identify(
      mark.properties?.anchorId ?? {},
      { kind: 'row', row, transformedIndex },
      owner,
      mark.encodings.anchorId,
    );
    coordinates.push(ctx.anchors.coordinate(identity.id, position, owner));
    ctx.targets?.register(identity, owner, 'coordinate');
  }

  return coordinates;
};

/** 把 path mark 与数据行下沉为 core IR 图层 */
export const lowerPathLayer = (
  mark: IRPlotMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  const supportsGenericOpenPath =
    isGenericCoordinateFrame(frame) &&
    mark.type === BuiltinPlotMark.Path &&
    mark.properties?.closure === undefined &&
    mark.properties?.closed !== true;
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame) && !supportsGenericOpenPath) {
    throw new RetikzPlotError(failLoudMessage(mark.type, frame.type));
  }

  const layer = lowerPath(
    mark,
    rows,
    frame,
    channels,
    channelValueOf<string>(channels, 'color'),
    channelDefaultOf<string>(channels, 'color'),
    ctx?.provenance,
  );
  if (layer === null || mark.type !== BuiltinPlotMark.Path) return layer;

  const coordinates = pathAnchorCoordinates(mark, rows, frame, ctx);
  const anchoredLayer = coordinates.length === 0 ? layer : { ...layer, children: [...coordinates, ...layer.children] };

  return attachMarkLayer(anchoredLayer, mark, ctx);
};

/** 收集 path mark 独有字段：连接顺序与 series 拆分 */
const collectPathMarkChannelFields = (mark: IRPlotPathMark, fields: FieldCollector): void => {
  fields.addFields(
    mark.encodings.order,
    mark.encodings.series,
    mark.properties?.closure?.kind === PathClosureKind.Stack ? mark.encodings.closure?.baseline : undefined,
  );
};

/** 内置 path mark definition */
export const pathMarkDefinition: MarkDefinition<IRPlotPathMark> = {
  schema: PathMarkSchema,
  labelHost: 'geometry',
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields: FieldCollector) => {
    collectCommonEncodingFields(mark, fields);
    collectPathChannelFields(mark, fields);
    collectPathMarkChannelFields(mark, fields);
  },
  lower: (mark, input, frame, channels, context) => {
    if (mark.encodings.from !== undefined || mark.encodings.steps !== undefined)
      return lowerPathInstances(mark, input, frame, channels, context);
    if (input.kind === 'single') return null;
    return lowerPathLayer(mark, input.rows, frame, channels, context);
  },
};
