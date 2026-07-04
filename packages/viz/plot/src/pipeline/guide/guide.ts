import type { IRGradientStop, IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import type { Position } from '@retikz/math';

import { arcEndPoint } from '@retikz/math';

import type {
  CoordinateFrame,
  DimensionRole,
  GuideContext,
  LoweredGuide,
  PolarCoordinateFrame,
  TernaryVertices,
} from '../../contract';
import type { ResolvedLegendGuideTokens } from '../../providers';
import type { AxisGuide, LegendChannelValue, LegendOrientValue, LegendPositionValue, ScalarValue } from '../../schemas';
import type { Rect } from '../../shared';
import type { ProvenanceContext } from '../provenance';

import { defaultOriginAxisTickSideOf } from '../../providers';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../providers/scale/shared';
import {
  AxisCardinalSide,
  AxisCrossingCorner,
  AxisCrossingLabelPolicy,
  AxisCrossingTickPolicy,
  AxisPlacementKind,
  AxisTickEndpointAffect,
  AxisTickLabelHideStrategy,
  AxisTickLabelOverflow,
  AxisTickMarkKind,
  AxisTickShapeOrientation,
  AxisTitlePlacementKeyword,
} from '../../schemas';
import { AXIS_LABEL_GAP, AXIS_TICK_LENGTH, estimateLabelWidth } from '../../shared';
import { guideLayerId, guideLayerMeta } from '../provenance';

/** 度 → 弧度；仅用于 polar radial 轴切向量，点投影统一走 @retikz/math 的 arcEndPoint。 */
const DEG_TO_RAD = Math.PI / 180;

/** 一段直线（首尾两点） */
type Segment = [readonly [number, number], readonly [number, number]];

type GuidePathStyle = Partial<Pick<IRPath, 'stroke' | 'strokeWidth' | 'drawOpacity' | 'dashPattern' | 'dashOffset' | 'lineCap'>>;
type GuideTextStyle = Partial<Pick<IRNode, 'font' | 'textColor' | 'opacity' | 'align' | 'lineHeight' | 'maxTextWidth' | 'rotate'>>;

const lineStyleProps = (style: GuidePathStyle | undefined): GuidePathStyle => ({
  ...(style?.stroke !== undefined ? { stroke: style.stroke } : {}),
  ...(style?.strokeWidth !== undefined ? { strokeWidth: style.strokeWidth } : {}),
  ...(style?.drawOpacity !== undefined ? { drawOpacity: style.drawOpacity } : {}),
  ...(style?.dashPattern !== undefined ? { dashPattern: style.dashPattern } : {}),
  ...(style?.dashOffset !== undefined ? { dashOffset: style.dashOffset } : {}),
  ...(style?.lineCap !== undefined ? { lineCap: style.lineCap } : {}),
});

const textStyleProps = (style: GuideTextStyle | undefined): GuideTextStyle => ({
  ...(style?.font !== undefined ? { font: style.font } : {}),
  ...(style?.textColor !== undefined ? { textColor: style.textColor } : {}),
  ...(style?.opacity !== undefined ? { opacity: style.opacity } : {}),
  ...(style?.align !== undefined ? { align: style.align } : {}),
  ...(style?.lineHeight !== undefined ? { lineHeight: style.lineHeight } : {}),
  ...(style?.maxTextWidth !== undefined ? { maxTextWidth: style.maxTextWidth } : {}),
  ...(style?.rotate !== undefined ? { rotate: style.rotate } : {}),
});

const axisLineStyleOf = (guide: AxisGuide): GuidePathStyle | false =>
  guide.line === false ? false : lineStyleProps(guide.line);

type AxisLineToken = Exclude<NonNullable<AxisGuide['line']>, false>;

const axisLineTokenOf = (guide: AxisGuide): AxisLineToken | undefined =>
  guide.line !== undefined && guide.line !== false ? guide.line : undefined;

const hasCartesianOnlyAxisLineGeometry = (guide: AxisGuide): boolean => {
  const line = axisLineTokenOf(guide);
  if (line === undefined) return false;
  return line.arrow !== undefined || (line.extent !== undefined && line.extent !== 'plotArea');
};

const assertNoCartesianOnlyAxisLineGeometry = (guide: AxisGuide): void => {
  if (hasCartesianOnlyAxisLineGeometry(guide)) {
    throw new Error('lowerPlots: axis line arrow and data extent are only supported for cartesian axes');
  }
};

const axisArrowMarkOf = (
  arrow: NonNullable<AxisLineToken['arrow']>['negative'] | NonNullable<AxisLineToken['arrow']>['positive'],
): NonNullable<IRPath['marks']>[number] | null => {
  if (arrow === undefined || arrow === false) return null;
  return { pos: 0, mark: arrow === true ? { kind: 'arrow' } : { kind: 'arrow', ...arrow } };
};

const axisLineMarksOf = (guide: AxisGuide): IRPath['marks'] | undefined => {
  const arrow = axisLineTokenOf(guide)?.arrow;
  if (arrow === undefined) return undefined;
  const negative = axisArrowMarkOf(arrow.negative);
  const positive = axisArrowMarkOf(arrow.positive);
  const marks: NonNullable<IRPath['marks']> = [];
  if (negative !== null) marks.push(negative);
  if (positive !== null) marks.push({ ...positive, pos: 1 });
  return marks.length > 0 ? marks : undefined;
};

type AxisTicksToken = NonNullable<AxisGuide['ticks']>;
type AxisTickMarkToken = Exclude<NonNullable<AxisTicksToken['mark']>, false>;
type AxisShapeTickMarkToken = Exclude<AxisTickMarkToken, { kind: 'line' }>;
type AxisCrossingToken = Exclude<NonNullable<AxisGuide['crossing']>, false>;
type AxisTickEndpointPolicyToken = Exclude<NonNullable<AxisTicksToken['endpoint']>, false>;
type AxisGuideValue = ScalarValue;
type AxisTitlePlacementValue = NonNullable<Exclude<NonNullable<AxisGuide['title']>, string>['placement']>;

const axisTickLineMarkOf = (guide: AxisGuide): { length: number; line: GuidePathStyle | false } | false | null => {
  const mark = guide.ticks?.mark;
  if (mark === false) return false;
  if (mark === undefined) {
    return { length: guide.ticks?.length ?? AXIS_TICK_LENGTH, line: guide.ticks?.line === false ? false : lineStyleProps(guide.ticks?.line) };
  }
  if (mark.kind !== AxisTickMarkKind.Line) return null;
  return { length: mark.length ?? AXIS_TICK_LENGTH, line: mark.line === false ? false : lineStyleProps(mark.line) };
};

const axisShapeTickMarkOf = (guide: AxisGuide): AxisShapeTickMarkToken | null => {
  const mark = guide.ticks?.mark;
  return mark !== undefined && mark !== false && mark.kind !== AxisTickMarkKind.Line ? mark : null;
};

const shapeMarkSizeOf = (mark: AxisShapeTickMarkToken): { width: number; height: number; offset: number } => {
  const size = mark.size ?? 4;
  const width = mark.width ?? size;
  const height = mark.height ?? size;
  return { width, height, offset: mark.offset ?? Math.max(width, height) / 2 };
};

const axisTickLengthOf = (guide: AxisGuide): number => {
  const line = axisTickLineMarkOf(guide);
  if (line !== null) return line === false ? 0 : line.length;
  const shape = axisShapeTickMarkOf(guide);
  if (shape === null) return AXIS_TICK_LENGTH;
  const size = shapeMarkSizeOf(shape);
  return size.offset + Math.max(size.width, size.height) / 2;
};

const axisTickLineStyleOf = (guide: AxisGuide): GuidePathStyle | false => {
  const line = axisTickLineMarkOf(guide);
  if (line === null || line === false || line.line === false) return false;
  return line.line;
};

const axisCrossingTokenOf = (guide: AxisGuide): AxisCrossingToken | undefined =>
  guide.crossing !== undefined && guide.crossing !== false ? guide.crossing : undefined;

const axisCrossingValueOf = (guide: AxisGuide): AxisGuideValue | undefined => {
  const crossing = axisCrossingTokenOf(guide);
  return crossing === undefined ? undefined : (crossing.value ?? 0);
};

const axisGuideValuesEqual = (a: AxisGuideValue, b: AxisGuideValue): boolean =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= 1e-6 : String(a) === String(b);

const isCrossingTickValue = (guide: AxisGuide, value: AxisGuideValue): boolean => {
  const crossingValue = axisCrossingValueOf(guide);
  return crossingValue !== undefined && axisGuideValuesEqual(crossingValue, value);
};

const shouldHideCrossingTickMark = (guide: AxisGuide, value: AxisGuideValue): boolean =>
  axisCrossingTokenOf(guide)?.tick === AxisCrossingTickPolicy.Hide && isCrossingTickValue(guide, value);

const shouldHideCrossingTickLabel = (guide: AxisGuide, value: AxisGuideValue): boolean =>
  axisCrossingTokenOf(guide)?.label === AxisCrossingLabelPolicy.Hide && isCrossingTickValue(guide, value);

const shouldUseCrossingCornerLabel = (guide: AxisGuide, value: AxisGuideValue): boolean =>
  axisCrossingTokenOf(guide)?.label === AxisCrossingLabelPolicy.Corner && isCrossingTickValue(guide, value);

const crossingCornerVectorOf = (corner: AxisCrossingToken['corner']): readonly [number, number] => {
  if (corner === AxisCrossingCorner.TopLeft) return [-1, -1];
  if (corner === AxisCrossingCorner.TopRight) return [1, -1];
  if (corner === AxisCrossingCorner.BottomRight) return [1, 1];
  return [-1, 1];
};

const axisTickEndpointPolicyOf = (guide: AxisGuide): AxisTickEndpointPolicyToken | undefined => {
  const endpoint = guide.ticks?.endpoint;
  return endpoint !== undefined && endpoint !== false ? endpoint : undefined;
};

const hasAxisArrowEnd = (
  arrow: NonNullable<AxisLineToken['arrow']>['negative'] | NonNullable<AxisLineToken['arrow']>['positive'],
): boolean => arrow !== undefined && arrow !== false;

const shouldHideEndpointTickMark = (
  guide: AxisGuide,
  projected: number,
  range: readonly [number, number],
  tickLength: number,
): boolean => {
  if (guide.ticks?.endpoint === false) return false;
  const arrow = axisLineTokenOf(guide)?.arrow;
  if (arrow === undefined) return false;
  const endpoint = axisTickEndpointPolicyOf(guide);
  if (endpoint?.hideWhenArrow === false) return false;
  const distance = endpoint?.distance ?? tickLength + 6;
  const [negative, positive] = range;
  return (
    (hasAxisArrowEnd(arrow.negative) && Math.abs(projected - negative) <= distance) ||
    (hasAxisArrowEnd(arrow.positive) && Math.abs(projected - positive) <= distance)
  );
};

const shouldHideEndpointTickLabel = (
  guide: AxisGuide,
  projected: number,
  range: readonly [number, number],
  tickLength: number,
): boolean =>
  axisTickEndpointPolicyOf(guide)?.affect === AxisTickEndpointAffect.MarkAndLabel &&
  shouldHideEndpointTickMark(guide, projected, range, tickLength);

const axisTitlePlacementRatioOf = (placement: AxisTitlePlacementValue | undefined): number => {
  if (typeof placement === 'number') return placement;
  if (placement === AxisTitlePlacementKeyword.AtStart) return 0;
  if (placement === AxisTitlePlacementKeyword.VeryNearStart) return 0.125;
  if (placement === AxisTitlePlacementKeyword.NearStart) return 0.25;
  if (placement === AxisTitlePlacementKeyword.NearEnd) return 0.75;
  if (placement === AxisTitlePlacementKeyword.VeryNearEnd) return 0.875;
  if (placement === AxisTitlePlacementKeyword.AtEnd) return 1;
  return 0.5;
};

type TickShapePlacement = {
  point: readonly [number, number];
  normal: readonly [number, number];
  tangent: readonly [number, number];
};

const angleOf = (vector: readonly [number, number]): number => (Math.atan2(vector[1], vector[0]) * 180) / Math.PI;

const axisTickShapeRefOf = (mark: AxisShapeTickMarkToken): IRNode['shape'] => {
  if (mark.kind === AxisTickMarkKind.Circle) return 'circle';
  if (mark.kind === AxisTickMarkKind.Square) return 'rectangle';
  if (mark.kind === AxisTickMarkKind.Triangle) return { type: 'polygon', params: { sides: 3 } };
  if (mark.kind === AxisTickMarkKind.Diamond) return 'diamond';
  return 'shape' in mark ? mark.shape : 'rectangle';
};

const axisTickShapeRotationOf = (mark: AxisShapeTickMarkToken, placement: TickShapePlacement): number | undefined => {
  const base = (() => {
    if (mark.orientation === AxisTickShapeOrientation.Outward) return angleOf(placement.normal);
    if (mark.orientation === AxisTickShapeOrientation.Inward) return angleOf(placement.normal) + 180;
    if (mark.orientation === AxisTickShapeOrientation.Axis) return angleOf(placement.tangent);
    return 0;
  })();
  const rotate = base + (mark.rotate ?? 0);
  return rotate === 0 ? undefined : rotate;
};

const axisTickShapeNodesOf = (guide: AxisGuide, placements: ReadonlyArray<TickShapePlacement>): Array<IRNode> => {
  const mark = axisShapeTickMarkOf(guide);
  if (mark === null) return [];
  const { width, height, offset } = shapeMarkSizeOf(mark);
  return placements.map((placement): IRNode => {
    const rotate = axisTickShapeRotationOf(mark, placement);
    return {
      type: 'node',
      position: [placement.point[0] + placement.normal[0] * offset, placement.point[1] + placement.normal[1] * offset],
      shape: axisTickShapeRefOf(mark),
      padding: 0,
      minimumSize: { width, height },
      fill: mark.fill ?? 'currentColor',
      ...(mark.stroke !== undefined ? { stroke: mark.stroke } : {}),
      ...(mark.strokeWidth !== undefined ? { strokeWidth: mark.strokeWidth } : {}),
      ...(mark.opacity !== undefined ? { opacity: mark.opacity } : {}),
      ...(mark.drawOpacity !== undefined ? { drawOpacity: mark.drawOpacity } : {}),
      ...(rotate !== undefined ? { rotate } : {}),
    };
  });
};

const axisTickLabelStyleOf = (guide: AxisGuide): GuideTextStyle | false =>
  guide.tickLabels === false ? false : textStyleProps(guide.tickLabels);

const axisTickLabelGapOf = (guide: AxisGuide): number =>
  guide.tickLabels !== false ? (guide.tickLabels?.gap ?? AXIS_LABEL_GAP) : AXIS_LABEL_GAP;

type AxisTickLabelsToken = Exclude<NonNullable<AxisGuide['tickLabels']>, false>;
type AxisTickLabelLayoutToken = NonNullable<AxisTickLabelsToken['layout']>;
type AxisTickLabelLayoutObject = Exclude<AxisTickLabelLayoutToken, false>;
type TickLabelLayoutAxis = 'x' | 'y' | 'both';
type TickLabelLayoutMode = 'cartesian-x' | 'cartesian-y' | 'generic';

type TickLabelBox = {
  index: number;
  node: IRNode;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

type TickLabelLayoutOptions = {
  fontSize: number;
  mode: TickLabelLayoutMode;
  axis: TickLabelLayoutAxis;
  axisRange?: readonly [number, number];
  sideNormal?: readonly [number, number];
};

const axisTickLabelsTokenOf = (guide: AxisGuide): AxisTickLabelsToken | undefined =>
  guide.tickLabels !== undefined && guide.tickLabels !== false ? guide.tickLabels : undefined;

const labelTextOf = (node: IRNode): string => textBlockMeasureText(node.text);

const labelFontSizeOf = (node: IRNode, fallback: number): number => {
  const size = node.font?.size;
  return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : fallback;
};

const rotatedLabelSizeOf = (node: IRNode, fontSize: number, rotate: number): { width: number; height: number } => {
  const size = labelFontSizeOf(node, fontSize);
  const width = Math.min(estimateLabelWidth(labelTextOf(node), size), node.maxTextWidth ?? Number.POSITIVE_INFINITY);
  const height = node.lineHeight ?? size;
  const radians = Math.abs(rotate) * DEG_TO_RAD;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return { width: width * cos + height * sin, height: width * sin + height * cos };
};

const nodePointOf = (node: IRNode): [number, number] => {
  const position = node.position;
  return Array.isArray(position) && typeof position[0] === 'number' && typeof position[1] === 'number'
    ? [position[0], position[1]]
    : [0, 0];
};

const tickLabelBoxOf = (node: IRNode, index: number, fontSize: number, rotate: number): TickLabelBox => {
  const [x, y] = nodePointOf(node);
  const size = rotatedLabelSizeOf(node, fontSize, rotate);
  return {
    index,
    node,
    x0: x - size.width / 2,
    x1: x + size.width / 2,
    y0: y - size.height / 2,
    y1: y + size.height / 2,
  };
};

const tickLabelBoxesOf = (nodes: ReadonlyArray<IRNode>, fontSize: number, rotate: number): Array<TickLabelBox> =>
  nodes.map((node, index) => tickLabelBoxOf(node, index, fontSize, rotate));

const tickLabelBoxesOverlap = (a: TickLabelBox, b: TickLabelBox, axis: TickLabelLayoutAxis, separation: number): boolean => {
  const xOverlap = a.x0 - separation < b.x1 && a.x1 + separation > b.x0;
  const yOverlap = a.y0 - separation < b.y1 && a.y1 + separation > b.y0;
  if (axis === 'x') return xOverlap;
  if (axis === 'y') return yOverlap;
  return xOverlap && yOverlap;
};

const hasTickLabelOverlap = (boxes: ReadonlyArray<TickLabelBox>, axis: TickLabelLayoutAxis, separation = 0): boolean =>
  boxes.some((box, index) => boxes.slice(0, index).some(previous => tickLabelBoxesOverlap(previous, box, axis, separation)));

const sampleTickLabelBoxes = (boxes: ReadonlyArray<TickLabelBox>, sampleSize: number | undefined): Array<TickLabelBox> => {
  if (sampleSize === undefined || boxes.length <= sampleSize) return [...boxes];
  if (sampleSize === 1) return [boxes[0]];
  const last = boxes.length - 1;
  return Array.from({ length: sampleSize }, (_unused, index) => boxes[Math.round((index * last) / (sampleSize - 1))]);
};

const defaultTickLabelAutoAnglesOf = (mode: TickLabelLayoutMode): Array<number> =>
  mode === 'cartesian-x' ? [0, -30, -45, -60, -90] : [0];

const tickLabelAutoRotateOf = (
  guide: AxisGuide,
  nodes: ReadonlyArray<IRNode>,
  layout: AxisTickLabelLayoutObject | undefined,
  options: TickLabelLayoutOptions,
): number => {
  const token = axisTickLabelsTokenOf(guide);
  if (token?.rotate !== undefined) return token.rotate;
  if (layout?.rotate === false) return 0;
  const rotate = layout?.rotate;
  const angles = rotate?.angles ?? defaultTickLabelAutoAnglesOf(options.mode);
  const recoverWhenFailed = rotate?.recoverWhenFailed ?? true;
  for (const angle of angles) {
    const boxes = sampleTickLabelBoxes(tickLabelBoxesOf(nodes, options.fontSize, angle), layout?.sampleSize);
    if (!hasTickLabelOverlap(boxes, options.axis)) return angle;
  }
  return recoverWhenFailed ? 0 : (angles[angles.length - 1] ?? 0);
};

const flushTickLabelBounds = (
  box: TickLabelBox,
  axis: Exclude<TickLabelLayoutAxis, 'both'>,
  range: readonly [number, number],
): IRNode => {
  const [lo, hi] = range[0] <= range[1] ? [range[0], range[1]] : [range[1], range[0]];
  const position: [number, number] = nodePointOf(box.node);
  if (axis === 'x') {
    const width = box.x1 - box.x0;
    if (width >= hi - lo) position[0] = (lo + hi) / 2;
    else if (box.x0 < lo) position[0] += lo - box.x0;
    else if (box.x1 > hi) position[0] -= box.x1 - hi;
  } else {
    const height = box.y1 - box.y0;
    if (height >= hi - lo) position[1] = (lo + hi) / 2;
    else if (box.y0 < lo) position[1] += lo - box.y0;
    else if (box.y1 > hi) position[1] -= box.y1 - hi;
  }
  return { ...box.node, position };
};

const applyTickLabelBounds = (
  boxes: ReadonlyArray<TickLabelBox>,
  axis: TickLabelLayoutAxis,
  range: readonly [number, number] | undefined,
  layout: AxisTickLabelLayoutObject | undefined,
): Array<IRNode> => {
  if (range === undefined || axis === 'both' || layout?.bounds === false) return boxes.map(box => box.node);
  const bounds = layout?.bounds;
  const overflow = bounds?.overflow ?? AxisTickLabelOverflow.Flush;
  if (overflow === AxisTickLabelOverflow.Allow) return boxes.map(box => box.node);
  const tolerance = bounds?.tolerance ?? 1;
  const [lo, hi] = range[0] <= range[1] ? [range[0], range[1]] : [range[1], range[0]];
  if (overflow === AxisTickLabelOverflow.Hide) {
    return boxes
      .filter(box => (axis === 'x' ? box.x0 >= lo - tolerance && box.x1 <= hi + tolerance : box.y0 >= lo - tolerance && box.y1 <= hi + tolerance))
      .map(box => box.node);
  }
  return boxes.map(box => flushTickLabelBounds(box, axis, range));
};

const hideGreedyTickLabels = (
  boxes: ReadonlyArray<TickLabelBox>,
  axis: TickLabelLayoutAxis,
  preserveEnds: boolean,
  separation: number,
): Array<IRNode> => {
  if (boxes.length <= 2) return boxes.map(box => box.node);
  const kept: Array<TickLabelBox> = preserveEnds ? [boxes[0]] : [];
  const last = preserveEnds ? boxes[boxes.length - 1] : undefined;
  for (const box of boxes.slice(preserveEnds ? 1 : 0, preserveEnds ? -1 : undefined)) {
    const conflicts = kept.some(keptBox => tickLabelBoxesOverlap(keptBox, box, axis, separation)) ||
      (last !== undefined && tickLabelBoxesOverlap(last, box, axis, separation));
    if (!conflicts) kept.push(box);
  }
  if (last !== undefined && !kept.includes(last)) kept.push(last);
  return kept.sort((a, b) => a.index - b.index).map(box => box.node);
};

const hideParityTickLabels = (
  boxes: ReadonlyArray<TickLabelBox>,
  axis: TickLabelLayoutAxis,
  preserveEnds: boolean,
  separation: number,
): Array<IRNode> => {
  if (!hasTickLabelOverlap(boxes, axis, separation)) return boxes.map(box => box.node);
  for (let stride = 2; stride < boxes.length; stride *= 2) {
    const picked = boxes.filter((_box, index) => index % stride === 0 || (preserveEnds && (index === 0 || index === boxes.length - 1)));
    if (!hasTickLabelOverlap(picked, axis, separation)) return picked.map(box => box.node);
  }
  return hideGreedyTickLabels(boxes, axis, preserveEnds, separation);
};

const applyTickLabelHide = (
  nodes: ReadonlyArray<IRNode>,
  layout: AxisTickLabelLayoutObject | undefined,
  options: TickLabelLayoutOptions,
  rotate: number,
): Array<IRNode> => {
  if (layout?.hide === false) return [...nodes];
  const hide = layout?.hide;
  const strategy = hide?.strategy ?? AxisTickLabelHideStrategy.Greedy;
  const preserveEnds = hide?.preserveEnds ?? true;
  const separation = hide?.separation ?? 0;
  const boxes = tickLabelBoxesOf(nodes, options.fontSize, rotate);
  if (strategy === AxisTickLabelHideStrategy.Parity) return hideParityTickLabels(boxes, options.axis, preserveEnds, separation);
  return hideGreedyTickLabels(boxes, options.axis, preserveEnds, separation);
};

const alignRotatedTickLabelEndpoint = (
  node: IRNode,
  fontSize: number,
  rotate: number,
  sideNormal: readonly [number, number] | undefined,
): IRNode => {
  if (sideNormal === undefined || rotate === 0) return node;
  const size = rotatedLabelSizeOf(node, fontSize, rotate);
  const shift = Math.abs(sideNormal[0]) > 0 ? size.width / 2 : size.height / 2;
  const [x, y] = nodePointOf(node);
  return { ...node, position: [x + sideNormal[0] * shift, y + sideNormal[1] * shift] };
};

const layoutTickLabelNodes = (
  guide: AxisGuide,
  nodes: ReadonlyArray<IRNode>,
  options: TickLabelLayoutOptions,
): Array<IRNode> => {
  if (nodes.length === 0) return [];
  const token = axisTickLabelsTokenOf(guide) ?? ({});
  const layout = token.layout;
  if (layout === false) {
    const rotate = token.rotate ?? 0;
    return nodes
      .map(node => ({ ...node, ...(token.rotate !== undefined ? { rotate: token.rotate } : {}) }))
      .map(node => alignRotatedTickLabelEndpoint(node, options.fontSize, rotate, options.sideNormal));
  }
  const layoutObject = layout === undefined ? undefined : layout;
  const rotate = tickLabelAutoRotateOf(guide, nodes, layoutObject, options);
  const hasFixedRotate = token.rotate !== undefined;
  const rotated = nodes
    .map(node => ({ ...node, ...(rotate !== 0 || hasFixedRotate ? { rotate } : {}) }))
    .map(node => alignRotatedTickLabelEndpoint(node, options.fontSize, rotate, options.sideNormal));
  if (nodes.length === 1) return rotated;
  const visible = applyTickLabelHide(rotated, layoutObject, options, rotate);
  return applyTickLabelBounds(tickLabelBoxesOf(visible, options.fontSize, rotate), options.axis, options.axisRange, layoutObject);
};

const axisTitleOf = (
  guide: AxisGuide,
): ({ text: IRNode['text']; gap?: number; placement?: AxisTitlePlacementValue } & GuideTextStyle) | null => {
  if (guide.title === undefined) return null;
  if (typeof guide.title === 'string') return { text: guide.title };
  return { text: guide.title.text, gap: guide.title.gap, placement: guide.title.placement, ...textStyleProps(guide.title) };
};

const textBlockMeasureText = (text: IRNode['text']): string => {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text
    .map(line => {
      if (typeof line === 'string') return line;
      if ('text' in line) return line.text;
      return line.runs
        .map(run => ('text' in run ? run.text : run.tex))
        .join('');
    })
    .join('\n');
};

const axisGridStyleOf = (guide: AxisGuide): GuidePathStyle | undefined =>
  typeof guide.grid === 'object' ? lineStyleProps(guide.grid) : undefined;

/** 把若干直线段拼成一条多子路径 Path（每段一对 move/line）；空段返回 null */
const segmentsToPath = (segments: Array<Segment>, style?: GuidePathStyle): IRPath | null => {
  if (segments.length === 0) return null;
  const steps: Array<IRStep> = segments.flatMap(([from, to]) => [
    { type: 'step', kind: 'move', to: [from[0], from[1]] },
    { type: 'step', kind: 'line', to: [to[0], to[1]] },
  ]);
  return { type: 'path', ...lineStyleProps(style), children: steps };
};

/** 某 dimension 是否为 primary 角色（cartesian x / polar angle）；否则 secondary（y / radius） */
const isPrimaryDimension = (dimension: string): boolean => dimension === 'x';

type CartesianAxisSide = 'top' | 'right' | 'bottom' | 'left';

const cartesianAxisSideFromEdge = (edge: string): CartesianAxisSide => {
  if (
    edge !== AxisCardinalSide.Top &&
    edge !== AxisCardinalSide.Right &&
    edge !== AxisCardinalSide.Bottom &&
    edge !== AxisCardinalSide.Left
  ) {
    throw new Error(
      `lowerPlots: cartesian axis edge placement must be one of top, right, bottom, or left (got "${edge}")`,
    );
  }
  return edge;
};

const assertCartesianAxisSideCompatible = (side: CartesianAxisSide, isX: boolean): void => {
  if (isX && side !== AxisCardinalSide.Top && side !== AxisCardinalSide.Bottom) {
    throw new Error(`lowerPlots: cartesian x axis only supports top or bottom side placement (got "${side}")`);
  }
  if (!isX && side !== AxisCardinalSide.Left && side !== AxisCardinalSide.Right) {
    throw new Error(`lowerPlots: cartesian y axis only supports left or right side placement (got "${side}")`);
  }
};

const cartesianAxisSideOf = (guide: AxisGuide, isX: boolean): CartesianAxisSide => {
  const placement = guide.placement;
  if (placement === undefined || placement.kind === AxisPlacementKind.Auto) {
    return isX ? AxisCardinalSide.Bottom : AxisCardinalSide.Left;
  }
  const side =
    placement.kind === AxisPlacementKind.Edge
      ? cartesianAxisSideFromEdge(placement.edge)
      : placement.kind === AxisPlacementKind.Origin
        ? (placement.tickSide ?? defaultOriginAxisTickSideOf(isX ? 'x' : 'y'))
        : placement.side;
  if (placement.kind === AxisPlacementKind.Origin) {
    if (isX && side !== AxisCardinalSide.Top && side !== AxisCardinalSide.Bottom) {
      throw new Error(`lowerPlots: cartesian x origin axis tickSide must be top or bottom (got "${side}")`);
    }
    if (!isX && side !== AxisCardinalSide.Left && side !== AxisCardinalSide.Right) {
      throw new Error(`lowerPlots: cartesian y origin axis tickSide must be left or right (got "${side}")`);
    }
  }
  assertCartesianAxisSideCompatible(side, isX);
  return side;
};

const axisPlacementOffsetOf = (guide: AxisGuide): number =>
  guide.placement?.kind === AxisPlacementKind.Side || guide.placement?.kind === AxisPlacementKind.Edge || guide.placement?.kind === AxisPlacementKind.Origin
    ? (guide.placement.offset ?? 0)
    : 0;

/** y 轴标题默认旋转：让文字局部顶部朝向轴线。 */
const cartesianYAxisTitleRotateOf = (side: CartesianAxisSide): number =>
  side === AxisCardinalSide.Right ? -90 : 90;

/**
 * 极坐标点投影的窄返回值 helper。
 * @description guide lowering 的 IR step 需要确定 Position；若上游 scale/tick 契约被破坏，则返回 [NaN, NaN] 让问题显性暴露。
 */
const finitePolarPoint = (center: Position, angleDeg: number, radius: number): Position =>
  Number.isFinite(angleDeg) && Number.isFinite(radius) ? arcEndPoint(center, radius, angleDeg) : [NaN, NaN];

/**
 * 轴 / 网格 scope 的 id + meta props（provenance 开时合成 `<plotId>.` 前缀 id + layer 来源 meta）
 * @description provenance 关（context undefined）→ 仅在用户给 guide.id 时绑裸 id、无 meta。
 *   开 → id 走 `<plotId>.<guideId|axis|grid.dim>`（plotId 缺则匿名）、meta 写 {source,layer,dimension}。
 */
const guideScopeProps = (
  guide: AxisGuide,
  layer: 'axis' | 'grid',
  context: ProvenanceContext | undefined,
): { id?: string; meta?: ReturnType<typeof guideLayerMeta> } => {
  if (!context) return layer === 'axis' && guide.id ? { id: guide.id } : {};
  // 用户句柄 guide.id 只挂轴层（一个 guide 一个外部句柄）；网格层走结构 id，避免轴 / 网格 id 撞名
  const guideId = layer === 'axis' ? guide.id : undefined;
  const id = guideLayerId(context.plotId, guideId, layer, guide.dimension);
  return { ...(id !== undefined ? { id } : {}), meta: guideLayerMeta(layer, guide.dimension) };
};

/** cartesian guide：直线轴 + 竖 / 横刻度 + grid 跨绘图区直线 */
const lowerCartesianGuide = (
  guide: AxisGuide,
  ctx: GuideContext,
  context: ProvenanceContext | undefined,
): LoweredGuide => {
  const { plotArea, fontSize } = ctx;
  const labelGap = ctx.labelGap ?? AXIS_LABEL_GAP;
  const left = plotArea.x;
  const right = plotArea.x + plotArea.width;
  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;
  const tickLength = axisTickLengthOf(guide);
  const tickLabelGap = axisTickLabelGapOf(guide);
  const tickLabelStyle = axisTickLabelStyleOf(guide);
  const showLabels = tickLabelStyle !== false;

  // cartesian1D 给 axisOrientation 覆盖（单维角色恒 x，但轴可竖排）；cartesian2D 按 dimension 判
  const isX = ctx.axisOrientation !== undefined ? ctx.axisOrientation === 'horizontal' : guide.dimension === 'x';
  const ticks = isX ? ctx.xTicks : ctx.yTicks;
  const project = isX ? ctx.projectX : ctx.projectY;
  const side = cartesianAxisSideOf(guide, isX);
  const offset = axisPlacementOffsetOf(guide);
  const originPlacement = guide.placement?.kind === AxisPlacementKind.Origin ? guide.placement : undefined;
  const originValue = originPlacement?.origin ?? 0;
  const axisY =
    originPlacement !== undefined && isX
      ? ctx.projectY.coordinate(originValue) + (side === AxisCardinalSide.Top ? -offset : offset)
      : side === AxisCardinalSide.Top
        ? top - offset
        : bottom + offset;
  const axisX =
    originPlacement !== undefined && !isX
      ? ctx.projectX.coordinate(originValue) + (side === AxisCardinalSide.Left ? -offset : offset)
      : side === AxisCardinalSide.Right
        ? right + offset
        : left - offset;
  const tickDirection = side === AxisCardinalSide.Top || side === AxisCardinalSide.Left ? -1 : 1;
  const axisLineToken = axisLineTokenOf(guide);

  // ---- 轴层 ----
  const axisLine: Segment = (() => {
    const extent = axisLineToken?.extent;
    if (extent !== undefined && extent !== 'plotArea') {
      const from = project.coordinate(extent.from);
      const to = project.coordinate(extent.to);
      return isX
        ? [
            [from, axisY],
            [to, axisY],
          ]
        : [
            [axisX, from],
            [axisX, to],
          ];
    }
    return isX
      ? [
          [left, axisY],
          [right, axisY],
        ]
      : [
          [axisX, bottom],
          [axisX, top],
        ];
  })();
  const axisRange: readonly [number, number] = isX ? [axisLine[0][0], axisLine[1][0]] : [axisLine[0][1], axisLine[1][1]];
  const tickEntries = ticks.values.map((value, index) => ({ value, label: ticks.labels[index], projected: project.coordinate(value) }));
  const visibleTickMarkEntries = tickEntries.filter(entry => {
    if (shouldHideCrossingTickMark(guide, entry.value)) return false;
    return !shouldHideEndpointTickMark(guide, entry.projected, axisRange, tickLength);
  });
  const tickSegments: Array<Segment> = visibleTickMarkEntries.map(entry => {
    const p = entry.projected;
    return isX
      ? [
          [p, axisY],
          [p, axisY + tickDirection * tickLength],
        ]
      : [
          [axisX, p],
          [axisX + tickDirection * tickLength, p],
        ];
  });
  const tickShapePlacements: Array<TickShapePlacement> = visibleTickMarkEntries.map(entry => {
    const p = entry.projected;
    return isX
      ? { point: [p, axisY], normal: [0, tickDirection], tangent: [1, 0] }
      : { point: [axisX, p], normal: [tickDirection, 0], tangent: [0, -1] };
  });
  const axisLineStyle = axisLineStyleOf(guide);
  const tickLineStyle = axisTickLineStyleOf(guide);
  const axisLinePath =
    axisLineStyle === false
      ? null
      : (() => {
          const path = segmentsToPath([axisLine], axisLineStyle);
          const marks = axisLineMarksOf(guide);
          return path !== null && marks !== undefined ? { ...path, marks } : path;
        })();
  const tickPath = tickLineStyle === false ? null : segmentsToPath(tickSegments, tickLineStyle);
  const tickShapeNodes = axisTickShapeNodesOf(guide, tickShapePlacements);
  const labels: Array<IRNode> = showLabels
    ? (() => {
        const cornerLabels: Array<IRNode> = [];
        const layoutLabels = tickEntries.flatMap((entry): Array<IRNode> => {
          if (shouldHideCrossingTickLabel(guide, entry.value)) return [];
          if (shouldHideEndpointTickLabel(guide, entry.projected, axisRange, tickLength)) return [];
          const p = entry.projected;
          const text = entry.label;
          const isCornerLabel = shouldUseCrossingCornerLabel(guide, entry.value);
          const position: [number, number] = (() => {
            if (isCornerLabel) {
              const vector = crossingCornerVectorOf(axisCrossingTokenOf(guide)?.corner);
              const distance = tickLength + tickLabelGap + fontSize / 2;
              return isX
                ? [p + vector[0] * distance, axisY + vector[1] * distance]
                : [axisX + vector[0] * distance, p + vector[1] * distance];
            }
            return isX
              ? [p, axisY + tickDirection * (tickLength + tickLabelGap + fontSize / 2)]
              : [
                  axisX +
                    tickDirection * (tickLength + tickLabelGap + estimateLabelWidth(text, fontSize) / 2),
                  p,
                ];
          })();
          const node: IRNode = { type: 'node', position, text, ...tickLabelStyle };
          if (isCornerLabel) {
            cornerLabels.push(node);
            return [];
          }
          return [node];
        });
        return [
          ...layoutTickLabelNodes(guide, layoutLabels, {
          fontSize,
          mode: isX ? 'cartesian-x' : 'cartesian-y',
          axis: isX ? 'x' : 'y',
          axisRange: isX ? [left, right] : [top, bottom],
          sideNormal: isX ? [0, tickDirection] : [tickDirection, 0],
          }),
          ...cornerLabels,
        ];
      })()
    : [];

  const titleNode = ((): IRNode | null => {
    const title = axisTitleOf(guide);
    if (title === null) return null;
    const titleStyle = textStyleProps(title);
    const titleGap = title.gap ?? labelGap;
    const yLabelBandWidth =
      showLabels && ticks.labels.length > 0
        ? Math.max(...ticks.labels.map(label => estimateLabelWidth(label, fontSize)))
        : 0;
    const labelOffset = isX
      ? tickLength + tickLabelGap + fontSize + titleGap + fontSize / 2
      : tickLength + tickLabelGap + yLabelBandWidth + titleGap + fontSize / 2;
    const placementRatio = axisTitlePlacementRatioOf(title.placement);
    const baseX = axisLine[0][0] + (axisLine[1][0] - axisLine[0][0]) * placementRatio;
    const baseY = axisLine[0][1] + (axisLine[1][1] - axisLine[0][1]) * placementRatio;
    const position: [number, number] = isX
      ? [baseX, baseY + tickDirection * labelOffset]
      : [baseX + tickDirection * labelOffset, baseY];
    const rotate = isX ? titleStyle.rotate : (titleStyle.rotate ?? cartesianYAxisTitleRotateOf(side));
    return { type: 'node', position, text: title.text, ...titleStyle, ...(rotate !== undefined ? { rotate } : {}) };
  })();
  const axisChildren: Array<IRPath | IRNode> = [...([axisLinePath, tickPath].filter(Boolean) as Array<IRPath>), ...tickShapeNodes, ...labels];
  if (titleNode) axisChildren.push(titleNode);
  const axisLayer: IRScope | null = axisChildren.length > 0
    ? (() => {
        return {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: axisChildren,
        };
      })()
    : null;

  // ---- 网格层（grid:true 才出）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const gridSegments: Array<Segment> = ticks.values.map(value => {
      const p = project.coordinate(value);
      return isX
        ? [
            [p, top],
            [p, bottom],
          ]
        : [
            [left, p],
            [right, p],
          ];
    });
    const gridPath = segmentsToPath(gridSegments, { drawOpacity: 0.15, ...axisGridStyleOf(guide) });
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor' },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 一条弧 Path（move 到弧起点 + arc step 扫 startAngle→endAngle，圆心 = frame.center、给定半径）；轴线与同心环复用 */
const arcPath = (frame: PolarCoordinateFrame, radius: number): IRPath => {
  const start = finitePolarPoint(frame.center, frame.startAngle, radius);
  return {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [start[0], start[1]] },
      {
        type: 'step',
        kind: 'arc',
        startAngle: frame.startAngle,
        endAngle: frame.endAngle,
        radius,
        center: [frame.center[0], frame.center[1]],
      },
    ],
  };
};

/**
 * polar angular axis：外圆弧轴线 + 每角向刻度短径向刻度线 + 圆周外标签
 * @description 轴线 = arc step（半径 outerRadius）；刻度 = 圆周点向外 AXIS_TICK_LENGTH 短线；
 *   标签 = center + (outerRadius+gap)·(cosθ,sinθ) 处 Node text。grid:true → 每刻度一条圆心→外圆辐条。
 */
const lowerAngularAxis = (
  guide: AxisGuide,
  ctx: GuideContext,
  frame: PolarCoordinateFrame,
  context: ProvenanceContext | undefined,
): LoweredGuide => {
  const { fontSize } = ctx;
  const labelGap = ctx.labelGap ?? AXIS_LABEL_GAP;
  const ticks = ctx.angularTicks ?? { values: [], labels: [] };
  const scale = frame.primary;
  const outer = frame.outerRadius;
  const tickLength = axisTickLengthOf(guide);
  const tickLabelGap = axisTickLabelGapOf(guide);
  const tickLabelStyle = axisTickLabelStyleOf(guide);
  const showLabels = tickLabelStyle !== false;

  // ---- 轴层 ----
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const theta = scale.coordinate(value);
    return [
      finitePolarPoint(frame.center, theta, outer),
      finitePolarPoint(frame.center, theta, outer + tickLength),
    ];
  });
  const tickShapePlacements: Array<TickShapePlacement> = ticks.values.map(value => {
    const theta = scale.coordinate(value);
    const point = finitePolarPoint(frame.center, theta, outer);
    const radians = theta * DEG_TO_RAD;
    return { point, normal: [Math.cos(radians), Math.sin(radians)], tangent: [-Math.sin(radians), Math.cos(radians)] };
  });
  const axisLineStyle = axisLineStyleOf(guide);
  const tickLineStyle = axisTickLineStyleOf(guide);
  const tickPath = tickLineStyle === false ? null : segmentsToPath(tickSegments, tickLineStyle);
  const tickShapeNodes = axisTickShapeNodesOf(guide, tickShapePlacements);
  const axisChildren: Array<IRPath | IRNode> =
    axisLineStyle === false ? [] : [{ ...arcPath(frame, outer), ...lineStyleProps(axisLineStyle) }];
  if (tickPath) axisChildren.push(tickPath);
  axisChildren.push(...tickShapeNodes);
  const labels: Array<IRNode> = showLabels
    ? layoutTickLabelNodes(
        guide,
        ticks.values.map((value, index): IRNode => {
          const theta = scale.coordinate(value);
          const position = finitePolarPoint(
            frame.center,
            theta,
            outer + tickLength + tickLabelGap + fontSize / 2,
          );
          return { type: 'node', position, text: ticks.labels[index], ...tickLabelStyle };
        }),
        { fontSize, mode: 'generic', axis: 'both' },
      )
    : [];
  const title = axisTitleOf(guide);
  if (title !== null) {
    const midAngle = (frame.startAngle + frame.endAngle) / 2;
    labels.push({
      type: 'node',
      position: finitePolarPoint(
        frame.center,
        midAngle,
        outer + tickLength + tickLabelGap + fontSize + (title.gap ?? labelGap) + fontSize / 2,
      ),
      text: title.text,
      ...textStyleProps(title),
    });
  }

  const axisLayer: IRScope = {
    type: 'scope',
    ...guideScopeProps(guide, 'axis', context),
    pathDefault: { stroke: 'currentColor' },
    nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
    children: [...axisChildren, ...labels],
  };

  // ---- 网格层（grid:true → 每角向刻度一条圆心→外圆辐条）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const spokes: Array<Segment> = ticks.values.map(value => {
      const theta = scale.coordinate(value);
      return [finitePolarPoint(frame.center, theta, frame.innerRadius), finitePolarPoint(frame.center, theta, outer)];
    });
    const gridPath = segmentsToPath(spokes, { drawOpacity: 0.15, ...axisGridStyleOf(guide) });
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor' },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/**
 * polar radial axis：沿 startAngle 辐条轴线 + 辐条上刻度 + 标签
 * @description 轴线 = center→外圆 直段（基准角 = startAngle）；刻度 = 辐条上每径向刻度短切向横线；
 *   标签 = 刻度点旁 Node text。grid:true → 每径向刻度一个同心圆环（arc step）。
 */
const lowerRadialAxis = (
  guide: AxisGuide,
  ctx: GuideContext,
  frame: PolarCoordinateFrame,
  context: ProvenanceContext | undefined,
): LoweredGuide => {
  const { fontSize } = ctx;
  const labelGap = ctx.labelGap ?? AXIS_LABEL_GAP;
  const ticks = ctx.radialTicks ?? { values: [], labels: [] };
  const scale = frame.secondary;
  const baseAngle = frame.startAngle;
  const tickLength = axisTickLengthOf(guide);
  const tickLabelGap = axisTickLabelGapOf(guide);
  const tickLabelStyle = axisTickLabelStyleOf(guide);
  const showLabels = tickLabelStyle !== false;
  // 辐条切向单位向量（垂直于辐条）；刻度短线与标签沿此方向朝一侧（-tangent）偏移，与 cartesian / angular 轴一致。
  // 不沿辐条方向画刻度——否则首尾刻度会沿辐条越出内 / 外圆端点（各多出半个刻度长）。
  const tangent: [number, number] = [-Math.sin(baseAngle * DEG_TO_RAD), Math.cos(baseAngle * DEG_TO_RAD)];

  // ---- 轴层 ----
  const axisLine: Segment = [
    finitePolarPoint(frame.center, baseAngle, frame.innerRadius),
    finitePolarPoint(frame.center, baseAngle, frame.outerRadius),
  ];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const radius = scale.coordinate(value);
    const point = finitePolarPoint(frame.center, baseAngle, radius);
    return [point, [point[0] - tangent[0] * tickLength, point[1] - tangent[1] * tickLength]];
  });
  const tickShapePlacements: Array<TickShapePlacement> = ticks.values.map(value => {
    const radius = scale.coordinate(value);
    const point = finitePolarPoint(frame.center, baseAngle, radius);
    return { point, normal: [-tangent[0], -tangent[1]], tangent: [Math.cos(baseAngle * DEG_TO_RAD), Math.sin(baseAngle * DEG_TO_RAD)] };
  });
  const axisLineStyle = axisLineStyleOf(guide);
  const tickLineStyle = axisTickLineStyleOf(guide);
  const axisLinePath = axisLineStyle === false ? null : segmentsToPath([axisLine], axisLineStyle);
  const tickPath = tickLineStyle === false ? null : segmentsToPath(tickSegments, tickLineStyle);
  const tickShapeNodes = axisTickShapeNodesOf(guide, tickShapePlacements);
  const labels: Array<IRNode> = showLabels
    ? layoutTickLabelNodes(
        guide,
        ticks.values.map((value, index): IRNode => {
        const radius = scale.coordinate(value);
        const point = finitePolarPoint(frame.center, baseAngle, radius);
        const text = ticks.labels[index];
        // 标签在刻度外侧（与刻度同侧、沿 -tangent），偏移 = 刻度长 + gap + 半字高
        const offset = tickLength + tickLabelGap + fontSize / 2;
        const position: [number, number] = [point[0] - tangent[0] * offset, point[1] - tangent[1] * offset];
        return { type: 'node', position, text, ...tickLabelStyle };
        }),
        { fontSize, mode: 'generic', axis: 'both' },
      )
    : [];
  const title = axisTitleOf(guide);
  if (title !== null) {
    const titlePoint = finitePolarPoint(frame.center, baseAngle, (frame.innerRadius + frame.outerRadius) / 2);
    const offset = tickLength + tickLabelGap + fontSize + (title.gap ?? labelGap) + fontSize / 2;
    labels.push({
      type: 'node',
      position: [titlePoint[0] - tangent[0] * offset, titlePoint[1] - tangent[1] * offset],
      text: title.text,
      ...textStyleProps(title),
    });
  }

  const axisChildren: Array<IRPath | IRNode> = [...([axisLinePath, tickPath].filter(Boolean) as Array<IRPath>), ...tickShapeNodes, ...labels];
  const axisLayer: IRScope | null = axisChildren.length > 0
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: axisChildren,
      }
    : null;

  // ---- 网格层（grid:true → 每径向刻度一个同心圆环）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const rings: Array<IRPath> = ticks.values
      .map(value => scale.coordinate(value))
      .filter(radius => Number.isFinite(radius) && radius > 0)
      .map(radius => ({ ...arcPath(frame, radius), ...lineStyleProps({ drawOpacity: 0.15, ...axisGridStyleOf(guide) }) }));
    if (rings.length > 0) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor' },
        children: rings,
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 两点线性插值（t∈[0,1]）：三角轴刻度 / 等值线几何 */
const lerp2 = (from: readonly [number, number], to: readonly [number, number], t: number): [number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
];

/**
 * 某 ternary 分量轴的三角角色：顶点 + 该分量 0 边的两端
 * @description x：顶点 Vx、0 边 = Vy–Vz；y：顶点 Vy、0 边 = Vx–Vz；z：顶点 Vz、0 边 = Vx–Vy。
 *   刻度沿 baseP→apex 边（= 三角一条边）；等值线（iso）= lerp(baseP,apex,t)–lerp(baseQ,apex,t)，平行 0 边。
 */
const ternaryAxisRoles = (
  dimension: string,
  vertices: TernaryVertices,
): { apex: readonly [number, number]; baseP: readonly [number, number]; baseQ: readonly [number, number] } => {
  const [vx, vy, vz] = vertices;
  if (dimension === 'x') return { apex: vx, baseP: vz, baseQ: vy };
  if (dimension === 'y') return { apex: vy, baseP: vx, baseQ: vz };
  return { apex: vz, baseP: vy, baseQ: vx }; // 'z'
};

/**
 * ternary 三角轴：沿一条边的刻度轴（0→100%）+ 平行对边的等值网格线
 * @description 轴线 = baseP→apex 三角边（三条 x/y/z 轴合起来 = 完整三角外框）；刻度沿该边、标签外法向偏移；
 *   grid:true → 内部刻度处画平行 0 边的等值线（lerp(baseP,apex,t)–lerp(baseQ,apex,t)）。
 */
const lowerTernaryGuide = (
  guide: AxisGuide,
  ctx: GuideContext,
  vertices: TernaryVertices,
  context: ProvenanceContext | undefined,
): LoweredGuide => {
  const { fontSize } = ctx;
  const labelGap = ctx.labelGap ?? AXIS_LABEL_GAP;
  const ticks = ctx.ternaryTicks ?? { values: [], labels: [] };
  const tickLength = axisTickLengthOf(guide);
  const tickLabelGap = axisTickLabelGapOf(guide);
  const tickLabelStyle = axisTickLabelStyleOf(guide);
  const showLabels = tickLabelStyle !== false;
  const { apex, baseP, baseQ } = ternaryAxisRoles(guide.dimension, vertices);
  const [vx, vy, vz] = vertices;
  const centroid: [number, number] = [(vx[0] + vy[0] + vz[0]) / 3, (vx[1] + vy[1] + vz[1]) / 3];

  // 外法向单位向量（远离重心）：刻度短线 / 标签朝外摆
  const outwardAt = (point: [number, number]): [number, number] => {
    const dx = point[0] - centroid[0];
    const dy = point[1] - centroid[1];
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  };

  // ---- 轴层：baseP→apex 边 + 沿边刻度 + 外侧标签 ----
  const axisLine: Segment = [baseP, apex];
  const tickSegments: Array<Segment> = [];
  const tickShapePlacements: Array<TickShapePlacement> = [];
  const tickLabelNodes: Array<IRNode> = [];
  const axisTangentLength = Math.hypot(apex[0] - baseP[0], apex[1] - baseP[1]) || 1;
  const axisTangent: [number, number] = [(apex[0] - baseP[0]) / axisTangentLength, (apex[1] - baseP[1]) / axisTangentLength];
  ticks.values.forEach((value, index) => {
    const t = Number(value);
    const point = lerp2(baseP, apex, t);
    const out = outwardAt(point);
    tickSegments.push([point, [point[0] + out[0] * tickLength, point[1] + out[1] * tickLength]]);
    tickShapePlacements.push({ point, normal: out, tangent: axisTangent });
    if (showLabels) {
      const offset = tickLength + tickLabelGap + fontSize / 2;
      tickLabelNodes.push({
        type: 'node',
        position: [point[0] + out[0] * offset, point[1] + out[1] * offset],
        text: ticks.labels[index],
        ...tickLabelStyle,
      });
    }
  });
  const labels: Array<IRNode> = layoutTickLabelNodes(guide, tickLabelNodes, { fontSize, mode: 'generic', axis: 'both' });
  const title = axisTitleOf(guide);
  if (title !== null) {
    const mid = lerp2(baseP, apex, 0.5);
    const out = outwardAt(mid);
    const offset = tickLength + tickLabelGap + fontSize + (title.gap ?? labelGap) + fontSize / 2;
    labels.push({
      type: 'node',
      position: [mid[0] + out[0] * offset, mid[1] + out[1] * offset],
      text: title.text,
      ...textStyleProps(title),
    });
  }
  const axisLineStyle = axisLineStyleOf(guide);
  const tickLineStyle = axisTickLineStyleOf(guide);
  const axisLinePath = axisLineStyle === false ? null : segmentsToPath([axisLine], axisLineStyle);
  const tickPath = tickLineStyle === false ? null : segmentsToPath(tickSegments, tickLineStyle);
  const tickShapeNodes = axisTickShapeNodesOf(guide, tickShapePlacements);
  const axisChildren: Array<IRPath | IRNode> = [...([axisLinePath, tickPath].filter(Boolean) as Array<IRPath>), ...tickShapeNodes, ...labels];
  const axisLayer: IRScope | null = axisChildren.length > 0
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: axisChildren,
      }
    : null;

  // ---- 网格层（grid:true → 内部刻度处平行 0 边的等值线）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const isoSegments: Array<Segment> = [];
  for (const value of ticks.values) {
      const t = Number(value);
      if (t <= 0 || t >= 1) continue; // 0（0 边）/ 1（顶点）退化，不画
      isoSegments.push([lerp2(baseP, apex, t), lerp2(baseQ, apex, t)]);
    }
    const gridPath = segmentsToPath(isoSegments, { drawOpacity: 0.15, ...axisGridStyleOf(guide) });
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor' },
        children: [gridPath],
      };
    }
  }
  return { gridLayer, axisLayer };
};

/** 把一串屏幕点连成一条折线 Path（move + line steps）；点数 < 2 返回 null */
const polylinePath = (points: ReadonlyArray<readonly [number, number]>): IRPath | null => {
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: [points[0][0], points[0][1]] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: [point[0], point[1]] })),
  ];
  return { type: 'path', children: steps };
};

/** 自定义坐标系轴线密采样点数（沿投影曲线取样连成轴线） */
const CUSTOM_AXIS_SAMPLES = 40;

/**
 * 自定义坐标系的曲线轴（通用 path-aware 轴）：沿 projectRoles 投影密采样画轴线 + 在 scale 刻度处放刻度 / 标签
 * @description 取该维度的位置 scale 刻度、其余角色锚在各自 scale 首刻度（≈ domain 起点），按 frame.roles 序喂 projectRoles
 *   得轴线（任意曲线）与刻度点；刻度短线 / 标签沿局部切向的法线摆。frame 无 roleScales[dimension] → 不画（返回空）。
 *   通用性即「轴 = 参数路径」：直线 / 拱 / 圆 / 螺旋同一套画法。自定义坐标系暂不生成网格。
 */
export const lowerCustomAxis = (
  frame: CoordinateFrame,
  guide: AxisGuide,
  fontSize: number,
  context: ProvenanceContext | undefined,
): LoweredGuide => {
  assertNoCartesianOnlyAxisLineGeometry(guide);
  if (guide.placement?.kind === AxisPlacementKind.Origin) {
    throw new Error('lowerPlots: origin axis placement is only supported for cartesian axes');
  }
  const scale = frame.roleScales?.[guide.dimension];
  if (!scale) return { gridLayer: null, axisLayer: null };
  const candidateTicks = resolveGuideTicks(scale, guide.ticks, guide.tickLabels || undefined);
  const ticks = resolveVisibleGuideTicks(candidateTicks, guide.ticks, value => scale.coordinate(value));
  const numericTicks = ticks.values
    .map((value, index) => ({ value: Number(value), label: ticks.labels[index] }))
    .filter(tick => Number.isFinite(tick.value));
  if (numericTicks.length === 0) return { gridLayer: null, axisLayer: null };
  const tickLength = axisTickLengthOf(guide);
  const tickLabelGap = axisTickLabelGapOf(guide);
  const tickLabelStyle = axisTickLabelStyleOf(guide);
  const showLabels = tickLabelStyle !== false;
  const labelGap = AXIS_LABEL_GAP;

  // 其它角色锚在各自 scale 首刻度（≈ domain 起点）；按 frame.roles 序拼 values 喂 projectRoles
  const anchorFor = (role: DimensionRole): unknown => {
    const roleScale = frame.roleScales?.[role];
    return roleScale ? roleScale.ticks().values[0] : 0;
  };
  const projectAt = (value: number): [number, number] | null =>
    frame.projectRoles(frame.roles.map(role => (role === guide.dimension ? value : anchorFor(role))));

  const lo = numericTicks[0].value;
  const hi = numericTicks[numericTicks.length - 1].value;
  const span = hi - lo;

  // 轴线：在维度范围内密采样连折线（任意投影曲线）
  const linePoints: Array<[number, number]> = [];
  for (let i = 0; i <= CUSTOM_AXIS_SAMPLES; i += 1) {
    const point = projectAt(lo + (span * i) / CUSTOM_AXIS_SAMPLES);
    if (point) linePoints.push(point);
  }
  const axisLinePath = polylinePath(linePoints);

  // 刻度 + 标签：沿局部切向的法线摆。切向优先取工厂回传的解析 frameAlong，缺则邻近采样数值差分回落
  const epsilon = span === 0 ? 1 : span * 1e-3;
  const valuesAt = (value: number): Array<unknown> =>
    frame.roles.map(role => (role === guide.dimension ? value : anchorFor(role)));
  // 该刻度点的 [屏幕点, 切向]：有 frameAlong 用解析切向，否则中心差分；非有限 → null
  const pointAndTangent = (value: number): [[number, number], [number, number]] | null => {
    if (frame.frameAlong) {
      const local = frame.frameAlong(guide.dimension, valuesAt(value));
      return local ? [local.origin, local.tangent] : null;
    }
    const point = projectAt(value);
    if (!point) return null;
    const before = projectAt(value - epsilon) ?? point;
    const after = projectAt(value + epsilon) ?? point;
    return [point, [after[0] - before[0], after[1] - before[1]]];
  };
  const tickSegments: Array<Segment> = [];
  const tickShapePlacements: Array<TickShapePlacement> = [];
  const tickLabelNodes: Array<IRNode> = [];
  for (const tick of numericTicks) {
    const resolved = pointAndTangent(tick.value);
    if (!resolved) continue;
    const [point, tangent] = resolved;
    const length = Math.hypot(tangent[0], tangent[1]) || 1;
    const normal: [number, number] = [-tangent[1] / length, tangent[0] / length];
    const unitTangent: [number, number] = [tangent[0] / length, tangent[1] / length];
    tickSegments.push([point, [point[0] + normal[0] * tickLength, point[1] + normal[1] * tickLength]]);
    tickShapePlacements.push({ point, normal, tangent: unitTangent });
    if (showLabels) {
      const offset = tickLength + tickLabelGap + fontSize / 2;
      tickLabelNodes.push({
        type: 'node',
        position: [point[0] + normal[0] * offset, point[1] + normal[1] * offset],
        text: tick.label,
        ...tickLabelStyle,
      });
    }
  }
  const labels: Array<IRNode> = layoutTickLabelNodes(guide, tickLabelNodes, { fontSize, mode: 'generic', axis: 'both' });
  const title = axisTitleOf(guide);
  if (title !== null) {
    const resolved = pointAndTangent((lo + hi) / 2);
    if (resolved) {
      const [point, tangent] = resolved;
      const length = Math.hypot(tangent[0], tangent[1]) || 1;
      const normal: [number, number] = [-tangent[1] / length, tangent[0] / length];
      const offset = tickLength + tickLabelGap + fontSize + (title.gap ?? labelGap) + fontSize / 2;
      labels.push({
        type: 'node',
        position: [point[0] + normal[0] * offset, point[1] + normal[1] * offset],
        text: title.text,
        ...textStyleProps(title),
      });
    }
  }

  const lineChildren: Array<IRPath> = [];
  const axisLineStyle = axisLineStyleOf(guide);
  if (axisLinePath && axisLineStyle !== false) lineChildren.push({ ...axisLinePath, ...lineStyleProps(axisLineStyle) });
  const tickLineStyle = axisTickLineStyleOf(guide);
  const tickPath = tickLineStyle === false ? null : segmentsToPath(tickSegments, tickLineStyle);
  if (tickPath) lineChildren.push(tickPath);
  const tickShapeNodes = axisTickShapeNodesOf(guide, tickShapePlacements);
  const axisChildren: Array<IRPath | IRNode> = [...lineChildren, ...tickShapeNodes, ...labels];
  if (axisChildren.length === 0) return { gridLayer: null, axisLayer: null };

  const axisLayer: IRScope = {
    type: 'scope',
    ...guideScopeProps(guide, 'axis', context),
    pathDefault: { stroke: 'currentColor' },
    nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
    children: axisChildren,
  };
  return { gridLayer: null, axisLayer };
};

/**
 * 把一个 axis guide 下沉成网格层 + 轴层（各自一层 core scope；样式上提到 scope）
 * @description 按坐标帧分支：ternary（ctx.ternaryVertices 存在）走三角轴；polar（ctx.frame 存在）按维度角色走 angular
 *   （外圆弧 + 圆周刻度 / 标签 + 角向辐条 grid）或 radial（辐条轴 + 同心环 grid）；否则走 cartesian 直线轴 / 网格。
 *   下沉目标统一是 core Node（标签）+ Path（直段 / arc step）。id → 轴层 scope.id（anchor 预留）。
 */
export const lowerGuide = (guide: AxisGuide, ctx: GuideContext, context?: ProvenanceContext): LoweredGuide => {
  if (ctx.ternaryVertices || ctx.frame) {
    assertNoCartesianOnlyAxisLineGeometry(guide);
  }
  if (guide.placement?.kind === AxisPlacementKind.Origin && (ctx.ternaryVertices || ctx.frame)) {
    throw new Error('lowerPlots: origin axis placement is only supported for cartesian axes');
  }
  if (ctx.ternaryVertices) {
    return lowerTernaryGuide(guide, ctx, ctx.ternaryVertices, context);
  }
  if (ctx.frame) {
    return isPrimaryDimension(guide.dimension)
      ? lowerAngularAxis(guide, ctx, ctx.frame, context)
      : lowerRadialAxis(guide, ctx, ctx.frame, context);
  }
  return lowerCartesianGuide(guide, ctx, context);
};

// ── legend ─────────────────────────────────────────────────────

/** legend swatch 边长（user units）；离散色块 / 形状框 / size 符号格的基准格尺寸 */
export const LEGEND_SWATCH_SIZE = 14;
/** legend swatch 到标签的水平间距（user units） */
export const LEGEND_LABEL_GAP = 6;
/** legend 条目间的行 / 列距（user units） */
export const LEGEND_ENTRY_GAP = 6;
/** legend 标题到首条目的间距（user units） */
export const LEGEND_TITLE_GAP = 6;
/** 连续色带 ramp 的长边长度（user units） */
export const LEGEND_RAMP_LENGTH = 100;
/** 连续色带 ramp 的短边宽度（user units） */
export const LEGEND_RAMP_THICKNESS = 12;

/**
 * 一个离散 legend 条目：swatch 视觉量 + 标签
 * @description color = 色块填充；shape = glyph 名（形状 swatch）；radius = size 梯度符号半径；opacity = 透明度块。
 *   一个条目按 channel 取其中一种视觉量；label 是已格式化的文本（formatter 在 expand 侧据 fieldType 选定）。
 */
export type LegendEntry = {
  /** 条目标签（类别串 / 代表值 / 区间） */
  label: string;
  /** 色块填充色（color / 分箱 swatch） */
  color?: string;
  /** glyph 形状名（shape swatch） */
  shape?: string;
  /** size 梯度符号半径（px） */
  radius?: number;
  /** 透明度（opacity 块；0..1） */
  opacity?: number;
};

/** 连续色带 ramp：渐变 stop（offset 0..1 + 色）+ 沿带刻度（offset 0..1 + 标签） */
export type LegendRamp = {
  /** 渐变 stop（喂 core linearGradient paint server） */
  stops: Array<IRGradientStop>;
  /** 沿带刻度标签（offset 0..1） */
  ticks: Array<{ offset: number; label: string }>;
};

/**
 * lowerLegend 入参：已解析的 legend 内容（形态 + 条目 / ramp + 摆放）
 * @description 形态选择（swatch / ramp）与颜色 / 代表值由 expand 据 descriptor + scale 求好后传入；
 *   本函数只管几何摆放与 core 节点产出（关注点分离：求值在 expand、绘制在 guide）。
 */
export type LegendInput = {
  /** 形态：swatch（离散 / 分箱 / size / opacity）或 ramp（连续色带） */
  form: 'swatch' | 'ramp';
  /** 绑定通道（决定 swatch 视觉量取色 / 形状 / 半径 / 透明度） */
  channel: LegendChannelValue;
  /** 标题（缺省 = 绑定字段名；undefined → 不画标题） */
  title?: IRNode['text'];
  /** 离散条目（form==='swatch'） */
  entries: Array<LegendEntry>;
  /** 连续色带（form==='ramp'） */
  ramp?: LegendRamp;
  /** 摆放位置（预留带所在边） */
  position: LegendPositionValue;
  /** 条目排布方向 */
  orient: LegendOrientValue;
  /** label 字号 */
  fontSize: number;
  /** 预留带矩形（plotArea 旁的 legend 带；条目从带左上角起摆） */
  band: Rect;
  /** legend scope id（稳定，'legend' 前缀；anchor / 识别用） */
  id?: string;
  /** 已按 built-in theme < PlotSpec.theme < LegendGuide.style 合并的视觉 token */
  style: ResolvedLegendGuideTokens;
};

/**
 * 矩形 swatch / ramp 条 → core Node（shape rectangle）
 * @description core PathSchema 要求 children ≥ 2 step，单 rectangle step 的 Path 非法；矩形改用 Node
 *   （与 bar mark 同款：shape rectangle + minimumSize + fill），符合「一切可见物是 Node」。
 *   入参沿用左上角 + 宽高语义，内部换算成 Node 中心点（Node.position 是中心）。
 */
const rectNode = (x: number, y: number, width: number, height: number): IRNode => ({
  type: 'node',
  position: [x + width / 2, y + height / 2],
  shape: 'rectangle',
  minimumSize: { width, height },
  padding: 0,
});

/**
 * 把已解析的 legend 内容下沉成一个 core scope（swatch / ramp + 标签）
 * @description swatch 形态：每条目一个矩形 swatch Node（shape rectangle，填 color / opacity；size 条目额外一个圆点 Node）+ 一个标签 Node，纵 / 横堆叠；
 *   ramp 形态：一个矩形 Node 填 core linearGradient paint server（连续真渐变）+ 沿带刻度标签 Node。
 *   条目几何在传入 band 内从左上角起摆，受无文字度量约束（plot-design §13.1）：超 band 溢出可接受、不做测量自适应。
 *   下沉目标统一是 core Node（标签 / swatch / ramp 矩形 / size 圆点），纯 JSON。
 */
export const lowerLegend = (input: LegendInput): IRScope => {
  const { fontSize, band, orient } = input;
  const { swatchSize, swatchGap, entryGap, titleGap, rampLength, rampThickness, title: titleStyle, label: labelStyle } =
    input.style;
  const children: Array<IRNode> = [];
  // 标题占一行（顶部），条目区从标题下方起
  let cursorY = band.y;
  if (input.title !== undefined) {
    const titleText = textBlockMeasureText(input.title);
    children.push({
      type: 'node',
      position: [band.x + estimateLabelWidth(titleText, fontSize) / 2, cursorY + fontSize / 2],
      text: input.title,
      ...titleStyle,
    });
    cursorY += fontSize + titleGap;
  }

  if (input.form === 'ramp' && input.ramp) {
    // 连续色带：一个矩形 Node 填 linearGradient（vertical → 自上而下、horizontal → 自左而右）
    const vertical = orient === 'vertical';
    const rampX = band.x;
    const rampY = cursorY;
    const ramp = vertical
      ? rectNode(rampX, rampY, rampThickness, rampLength)
      : rectNode(rampX, rampY, rampLength, rampThickness);
    // 垂直色带：offset 0 在顶（小值上 / 大值下，与轴一致需翻转）；这里 0 在带起点，stops 直接用
    const angle = vertical ? 90 : 0;
    ramp.fill = { kind: 'linearGradient', stops: input.ramp.stops, angle };
    children.push(ramp);
    // 沿带刻度标签
    for (const tick of input.ramp.ticks) {
      const position: [number, number] = vertical
        ? [
            rampX + rampThickness + swatchGap + estimateLabelWidth(tick.label, fontSize) / 2,
            rampY + tick.offset * rampLength,
          ]
        : [rampX + tick.offset * rampLength, rampY + rampThickness + swatchGap + fontSize / 2];
      children.push({ type: 'node', position, text: tick.label, ...labelStyle });
    }
  } else {
    // 离散 swatch：逐条目堆叠（vertical 自上而下、horizontal 自左而右）
    const vertical = orient === 'vertical';
    let cursorX = band.x;
    let rowY = cursorY;
    for (const entry of input.entries) {
      if (entry.shape !== undefined) {
        // shape 图例：swatch 本身就是编码的 glyph（circle / rectangle / diamond…），不画矩形框
        children.push({
          type: 'node',
          position: [cursorX + swatchSize / 2, rowY + swatchSize / 2],
          shape: entry.shape,
          minimumSize: swatchSize,
          fill: entry.color ?? 'currentColor',
        });
      } else {
        // color / 分箱 / opacity / size：矩形色块（size 再叠圆点）
        const swatch = rectNode(cursorX, rowY, swatchSize, swatchSize);
        if (entry.color !== undefined) swatch.fill = entry.color;
        if (entry.opacity !== undefined) {
          swatch.fill = 'currentColor';
          swatch.fillOpacity = entry.opacity;
        }
        children.push(swatch);
        // size 梯度符号：在格内画一个代表半径的圆点 Node（覆盖 swatch 框，给出比例感）
        if (entry.radius !== undefined) {
          children.push({
            type: 'node',
            position: [cursorX + swatchSize / 2, rowY + swatchSize / 2],
            shape: 'circle',
            minimumSize: entry.radius * Math.SQRT2,
            fill: 'currentColor',
          });
        }
      }
      // 标签：swatch 右侧
      const labelX = cursorX + swatchSize + swatchGap + estimateLabelWidth(entry.label, fontSize) / 2;
      const labelY = rowY + swatchSize / 2;
      children.push({ type: 'node', position: [labelX, labelY], text: entry.label, ...labelStyle });
      if (vertical) {
        rowY += swatchSize + entryGap;
      } else {
        cursorX = labelX + estimateLabelWidth(entry.label, fontSize) / 2 + entryGap;
      }
    }
  }

  return {
    type: 'scope',
    ...(input.id !== undefined ? { id: input.id } : {}),
    // 标签字号 + 默认无描边（swatch / ramp / glyph / 标签都不要描边边框）；不写 nodeDefault.shape（每个 swatch / glyph Node 自带 shape，避免整层被当成 mark 层）。
    // 用 strokeWidth: 0 而非 stroke: 'none'——后者是 axis 层的判别特征，会让 legend 层被误判为 axis。
    nodeDefault: { font: { size: fontSize }, padding: 0, strokeWidth: 0 },
    children,
  };
};
