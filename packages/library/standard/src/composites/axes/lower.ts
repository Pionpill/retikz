import type { IRNode, IRPath, IRPosition } from '@retikz/core';

import type { IRStandardPathStrokeStyle } from '../shared/types';
import type { IRAxes } from './types';

import { enumerateLattice } from '../shared/lattice';
import { AxesArrowMode } from './constants';

type AxesChild = IRPath | IRNode;

/** 将 Standard Axes 规则确定性下沉为已有 Core Path 与 Node */
export const lowerAxes = (axes: IRAxes): Array<AxesChild> => {
  const children: Array<AxesChild> = [];
  const [originX, originY] = axes.origin;
  const ticks = axes.ticks;

  if (axes.grid !== undefined) {
    const [spacingX, spacingY] =
      typeof axes.grid.spacing === 'number'
        ? [axes.grid.spacing, axes.grid.spacing]
        : [axes.grid.spacing.x, axes.grid.spacing.y];
    const verticalStyle = { ...axes.grid.style, ...axes.grid.vertical };
    const horizontalStyle = { ...axes.grid.style, ...axes.grid.horizontal };

    enumerateLattice({
      min: axes.bounds.x.min,
      max: axes.bounds.x.max,
      spacing: spacingX,
      origin: originX,
      includeBoundary: false,
    }).forEach(line => {
      children.push(createLinePath([line.value, axes.bounds.y.min], [line.value, axes.bounds.y.max], verticalStyle));
    });
    enumerateLattice({
      min: axes.bounds.y.min,
      max: axes.bounds.y.max,
      spacing: spacingY,
      origin: originY,
      includeBoundary: false,
    }).forEach(line => {
      children.push(createLinePath([axes.bounds.x.min, line.value], [axes.bounds.x.max, line.value], horizontalStyle));
    });
  }

  children.push(
    createAxisPath([axes.bounds.x.min, originY], [axes.bounds.x.max, originY], axes),
    createAxisPath([originX, axes.bounds.y.min], [originX, axes.bounds.y.max], axes),
  );

  if (ticks?.x !== undefined) {
    enumerateTickValues(axes.bounds.x.min, axes.bounds.x.max, ticks.x, originX).forEach(value => {
      children.push(createLinePath([value, originY - ticks.size / 2], [value, originY + ticks.size / 2], ticks.style));
    });
  }
  if (ticks?.y !== undefined) {
    enumerateTickValues(axes.bounds.y.min, axes.bounds.y.max, ticks.y, originY).forEach(value => {
      children.push(createLinePath([originX - ticks.size / 2, value], [originX + ticks.size / 2, value], ticks.style));
    });
  }

  if (axes.labels.x !== null) children.push(createLabel([axes.bounds.x.max + 8, originY], axes.labels.x));
  if (axes.labels.y !== null) children.push(createLabel([originX, axes.bounds.y.max + 8], axes.labels.y));

  return children;
};

const enumerateTickValues = (min: number, max: number, spacing: number, origin: number): Array<number> =>
  enumerateLattice({ min, max, spacing, origin, includeBoundary: false })
    .filter(value => value.index !== 0)
    .map(value => value.value);

const createLinePath = (from: IRPosition, to: IRPosition, style: IRStandardPathStrokeStyle | undefined): IRPath => ({
  ...style,
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: from },
    { type: 'step', kind: 'line', to },
  ],
});

const createAxisPath = (from: IRPosition, to: IRPosition, axes: IRAxes): IRPath => {
  const marks =
    axes.axes.arrows === AxesArrowMode.None
      ? undefined
      : axes.axes.arrows === AxesArrowMode.Both
        ? [
            { pos: 0, mark: { kind: 'arrow' as const } },
            { pos: 1, mark: { kind: 'arrow' as const } },
          ]
        : [{ pos: 1, mark: { kind: 'arrow' as const } }];

  return {
    ...createLinePath(from, to, axes.axes.style),
    ...(marks === undefined ? {} : { marks }),
  };
};

const createLabel = (position: IRPosition, text: string): IRNode => ({
  type: 'node',
  position,
  text,
  strokeWidth: 0,
  padding: 0,
  zIndex: 1,
});
