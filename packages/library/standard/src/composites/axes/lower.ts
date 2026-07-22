import type { IRNode, IRPath, IRPosition, IRTextBlock } from '@retikz/core';

import type { IRStandardPathStrokeStyle } from '../shared/types';
import type { IRAxes } from './types';

import { enumerateLattice } from '../shared/lattice';
import { enumerateAxesTickValues, resolveAxesExtent } from './axis';
import { AxesArrowMode, AxesLabelEnd, AxesTickSide } from './constants';

type AxesChild = IRPath | IRNode;
type AxesAxis = Exclude<IRAxes['x'], false>;
type AxesTicks = Exclude<AxesAxis['ticks'], false | undefined>;
type AxesTickLabels = Exclude<AxesTicks['labels'], false | undefined>;
type AxesTextStyle = NonNullable<AxesTickLabels['style']>;
type AxesAxisLabel = Exclude<AxesAxis['label'], false>;
type AxesOriginLabel = Exclude<IRAxes['originLabel'], false>;

/** 将 Standard Axes 规则确定性下沉为已有 Core Path 与 Node */
export const lowerAxes = (axes: IRAxes): Array<AxesChild> => {
  const children: Array<AxesChild> = [];
  const [originX, originY] = axes.origin;
  const extentX = resolveAxesExtent(axes.extent.x);
  const extentY = resolveAxesExtent(axes.extent.y);
  const minX = originX - extentX.negative;
  const maxX = originX + extentX.positive;
  const minY = originY - extentY.positive;
  const maxY = originY + extentY.negative;

  if (axes.grid !== undefined) {
    const [spacingX, spacingY] =
      typeof axes.grid.spacing === 'number'
        ? [axes.grid.spacing, axes.grid.spacing]
        : [axes.grid.spacing.x, axes.grid.spacing.y];
    const [offsetX, offsetY] = axes.grid.offset;
    const verticalStyle = { ...axes.grid.style, ...axes.grid.vertical };
    const horizontalStyle = { ...axes.grid.style, ...axes.grid.horizontal };

    enumerateLattice({
      min: -extentX.negative,
      max: extentX.positive,
      spacing: spacingX,
      origin: offsetX,
      includeBoundary: false,
    }).forEach(line => {
      children.push(createLinePath([originX + line.value, minY], [originX + line.value, maxY], verticalStyle));
    });
    enumerateLattice({
      min: -extentY.negative,
      max: extentY.positive,
      spacing: spacingY,
      origin: offsetY,
      includeBoundary: false,
    }).forEach(line => {
      const y = originY - line.value;
      children.push(createLinePath([minX, y], [maxX, y], horizontalStyle));
    });
  }

  if (axes.x !== false && axes.x.line !== false) {
    children.push(createAxisPath([minX, originY], [maxX, originY], axes.x.line));
  }
  if (axes.y !== false && axes.y.line !== false) {
    children.push(createAxisPath([originX, maxY], [originX, minY], axes.y.line));
  }

  if (axes.x !== false) appendAxisTicks(children, 'x', axes.x, axes.extent.x, axes.origin);
  if (axes.y !== false) appendAxisTicks(children, 'y', axes.y, axes.extent.y, axes.origin);

  if (axes.x !== false) appendTickLabels(children, 'x', axes.x, axes.origin);
  if (axes.y !== false) appendTickLabels(children, 'y', axes.y, axes.origin);

  if (axes.x !== false && axes.x.label !== false) {
    children.push(createAxisLabel('x', axes.x.label, axes.origin, extentX));
  }
  if (axes.y !== false && axes.y.label !== false) {
    children.push(createAxisLabel('y', axes.y.label, axes.origin, extentY));
  }
  if (axes.originLabel !== false) {
    children.push(createOriginLabel(axes.originLabel, axes.origin));
  }

  return children;
};

const appendAxisTicks = (
  children: Array<AxesChild>,
  axisName: 'x' | 'y',
  axis: AxesAxis,
  extentInput: IRAxes['extent']['x'],
  origin: IRPosition,
): void => {
  if (axis.ticks === undefined || axis.ticks === false) return;

  const ticks = axis.ticks;
  const [originX, originY] = origin;
  const tickLengths = resolveTickSideLengths(ticks.side, ticks.length);
  enumerateAxesTickValues(ticks.source, resolveAxesExtent(extentInput), ticks.endpointGap).forEach(value => {
    if (axisName === 'x') {
      const x = originX + value;
      children.push(
        createLinePath([x, originY - tickLengths.positive], [x, originY + tickLengths.negative], ticks.style),
      );
    } else {
      const y = originY - value;
      children.push(
        createLinePath([originX - tickLengths.negative, y], [originX + tickLengths.positive, y], ticks.style),
      );
    }
  });
};

const appendTickLabels = (
  children: Array<AxesChild>,
  axisName: 'x' | 'y',
  axis: AxesAxis,
  origin: IRPosition,
): void => {
  const ticks = axis.ticks;
  if (ticks === undefined || ticks === false) return;
  const labels = ticks.labels;
  if (labels === undefined || labels === false) return;
  const [originX, originY] = origin;
  const distance = resolveTickSideLengths(ticks.side, ticks.length).negative + labels.offset;
  labels.entries.forEach(entry => {
    const position: IRPosition =
      axisName === 'x' ? [originX + entry.value, originY + distance] : [originX - distance, originY - entry.value];
    children.push(createTextNode(position, entry.text, labels.style));
  });
};

const createAxisLabel = (
  axisName: 'x' | 'y',
  label: AxesAxisLabel,
  origin: IRPosition,
  extent: { negative: number; positive: number },
): IRNode => {
  const resolved = isAxisLabelObject(label)
    ? label
    : { text: label, end: AxesLabelEnd.Positive, offset: 8, style: undefined };
  const direction = resolved.end === AxesLabelEnd.Positive ? 1 : -1;
  const length = resolved.end === AxesLabelEnd.Positive ? extent.positive : extent.negative;
  const [originX, originY] = origin;
  const position: IRPosition =
    axisName === 'x'
      ? [originX + direction * (length + resolved.offset), originY]
      : [originX, originY - direction * (length + resolved.offset)];
  return createTextNode(position, resolved.text, resolved.style);
};

const createOriginLabel = (label: AxesOriginLabel, origin: IRPosition): IRNode => {
  const resolved = isOriginLabelObject(label) ? label : { text: label, offset: 10, style: undefined };
  return createTextNode([origin[0] - resolved.offset, origin[1] + resolved.offset], resolved.text, resolved.style);
};

/** 将刻度完整长度分配到轴线两侧 */
const resolveTickSideLengths = (side: AxesTicks['side'], length: number): { negative: number; positive: number } => {
  if (side === AxesTickSide.Positive) return { negative: 0, positive: length };
  if (side === AxesTickSide.Negative) return { negative: length, positive: 0 };
  return { negative: length / 2, positive: length / 2 };
};

const isAxisLabelObject = (label: AxesAxisLabel): label is Extract<AxesAxisLabel, { text: IRTextBlock; end: string }> =>
  typeof label === 'object' && !Array.isArray(label) && 'text' in label;

const isOriginLabelObject = (
  label: AxesOriginLabel,
): label is Extract<AxesOriginLabel, { text: IRTextBlock; offset: number }> =>
  typeof label === 'object' && !Array.isArray(label) && 'text' in label;

const createLinePath = (from: IRPosition, to: IRPosition, style: IRStandardPathStrokeStyle | undefined): IRPath => ({
  ...style,
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: from },
    { type: 'step', kind: 'line', to },
  ],
});

const createAxisPath = (from: IRPosition, to: IRPosition, line: Exclude<AxesAxis['line'], false>): IRPath => {
  const createArrowMark = (endpoint: 'start' | 'end'): NonNullable<IRPath['marks']>[number]['mark'] => {
    const { start, end, ...shared } = line.arrowDetail ?? {};
    return { kind: 'arrow', ...shared, ...(endpoint === 'start' ? start : end) };
  };
  const marks =
    line.arrows === AxesArrowMode.None
      ? undefined
      : line.arrows === AxesArrowMode.Both
        ? [
            { pos: 0, mark: createArrowMark('start') },
            { pos: 1, mark: createArrowMark('end') },
          ]
        : [
            {
              pos: line.arrows === AxesArrowMode.Negative ? 0 : 1,
              mark: createArrowMark(line.arrows === AxesArrowMode.Negative ? 'start' : 'end'),
            },
          ];

  return {
    ...createLinePath(from, to, line.style),
    ...(marks === undefined ? {} : { marks }),
  };
};

const createTextNode = (position: IRPosition, text: IRTextBlock, style: AxesTextStyle | undefined): IRNode => ({
  ...style,
  type: 'node',
  position,
  text,
  strokeWidth: 0,
  padding: 0,
  zIndex: 1,
});
