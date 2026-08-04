import type { IRNode, IRPath, IRPosition, IRScope, IRTextBlock } from '@retikz/core';

import type { IRStandardPathStrokeStyle } from '../shared/types';
import type { IRAxes } from './types';

import { enumerateLattice } from '../shared/lattice';
import { AxesArrowMode, AxesLabelEnd, AxesTickSide } from './constants';
import { enumerateAxesTickValues, resolveAxesExtent } from './schemas/utils';

type AxesChild = IRPath | IRNode;
type AxesAxis = IRAxes['x'];
type AxesTicks = Exclude<AxesAxis['ticks'], false | undefined>;
type AxesTickLabels = Exclude<AxesTicks['labels'], false | undefined>;
type AxesTextStyle = NonNullable<AxesTickLabels['style']>;
type AxesAxisLabel = Exclude<AxesAxis['label'], false>;
type AxesOriginLabel = Exclude<IRAxes['origin']['label'], false>;

/** 将 Standard Axes 规则确定性下沉为已有 Core Path 与 Node */
export const lowerAxes = (axes: IRAxes): IRScope => {
  const { namespace: _namespace, type: _type, origin, x, y, ...scopeProps } = axes;
  void _namespace;
  void _type;
  const children: Array<AxesChild> = [];
  const [originX, originY] = origin.position;
  const extentX = resolveAxesExtent(x.extent);
  const extentY = resolveAxesExtent(y.extent);
  const minX = originX - extentX.negative;
  const maxX = originX + extentX.positive;
  const minY = originY - extentY.positive;
  const maxY = originY + extentY.negative;

  const xGrid = x.grid;
  if (xGrid !== undefined && xGrid !== false) {
    enumerateLattice({
      min: -extentX.negative,
      max: extentX.positive,
      spacing: xGrid.spacing,
      origin: xGrid.offset,
      includeBoundary: false,
    }).forEach(line => {
      children.push(createLinePath([originX + line.value, minY], [originX + line.value, maxY], xGrid.style));
    });
  }
  const yGrid = y.grid;
  if (yGrid !== undefined && yGrid !== false) {
    enumerateLattice({
      min: -extentY.negative,
      max: extentY.positive,
      spacing: yGrid.spacing,
      origin: yGrid.offset,
      includeBoundary: false,
    }).forEach(line => {
      const lineY = originY - line.value;
      children.push(createLinePath([minX, lineY], [maxX, lineY], yGrid.style));
    });
  }

  if (x.line !== false) {
    children.push(createAxisPath([minX, originY], [maxX, originY], x.line));
  }
  if (y.line !== false) {
    children.push(createAxisPath([originX, maxY], [originX, minY], y.line));
  }

  appendAxisTicks(children, 'x', x, x.extent, origin.position);
  appendAxisTicks(children, 'y', y, y.extent, origin.position);

  appendTickLabels(children, 'x', x, origin.position);
  appendTickLabels(children, 'y', y, origin.position);

  if (x.label !== false) {
    children.push(createAxisLabel('x', x.label, origin.position, extentX));
  }
  if (y.label !== false) {
    children.push(createAxisLabel('y', y.label, origin.position, extentY));
  }
  if (origin.label !== false) {
    children.push(createOriginLabel(origin.label, origin.position));
  }

  return { type: 'scope', ...scopeProps, children };
};

const appendAxisTicks = (
  children: Array<AxesChild>,
  axisName: 'x' | 'y',
  axis: AxesAxis,
  extentInput: AxesAxis['extent'],
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
