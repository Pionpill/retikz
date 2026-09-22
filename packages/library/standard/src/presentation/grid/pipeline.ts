import type { IRPath, IRScope } from '@retikz/core';

import type { IRStandardPathBorderStyle, IRStandardPathStrokeStyle } from '../../shared/types';
import { enumerateLattice } from '../shared/lattice';
import { GridBorderOrder } from './constants';
import type { GridNumericBounds } from './geometry';
import type { CanonicalGridLine } from './resolve';
import { resolveGrid } from './resolve';
import type { IRGrid } from './types';

type GridBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type GridLineBounds = GridBounds & {
  lineMinX: number;
  lineMaxX: number;
  lineMinY: number;
  lineMaxY: number;
};

type GridLineConfig = CanonicalGridLine;

/** 将 Standard Grid 规则确定性下沉为已有 Core Path 或带中心定位的 Scope */
export const lowerGrid = (grid: IRGrid): IRScope => {
  const { namespace: _namespace, type: _type, bounds, line, border, ...scopeProps } = resolveGrid(grid);
  void _namespace;
  void _type;
  const canonical = bounds;
  const { minX, minY, maxX, maxY } = canonical;
  const canonicalLines = line;
  const borderPadding = border?.padding ?? 0;
  const lineBounds: GridLineBounds = {
    minX,
    maxX,
    minY,
    maxY,
    lineMinX: border?.extendLines ? minX - borderPadding : minX,
    lineMaxX: border?.extendLines ? maxX + borderPadding : maxX,
    lineMinY: border?.extendLines ? minY - borderPadding : minY,
    lineMaxY: border?.extendLines ? maxY + borderPadding : maxY,
  };
  const paths: Array<IRPath> = [];

  if (border?.order === GridBorderOrder.Behind) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, border.style));
  }

  if (canonicalLines !== false) {
    appendGridLines(paths, 'vertical', canonical, lineBounds, canonicalLines.vertical);
    appendGridLines(paths, 'horizontal', canonical, lineBounds, canonicalLines.horizontal);
  }

  if (border !== undefined && border.order === GridBorderOrder.Front) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, border.style));
  }

  const children: Array<IRPath | IRScope> =
    canonical.position === undefined
      ? paths
      : [
          {
            type: 'scope',
            transforms: [{ kind: 'offset-translate', of: canonical.position }],
            children: paths,
          },
        ];
  return { type: 'scope', ...scopeProps, children };
};

const appendGridLines = (
  paths: Array<IRPath>,
  axis: 'vertical' | 'horizontal',
  canonical: GridNumericBounds,
  bounds: GridLineBounds,
  line: GridLineConfig,
): void => {
  const isVertical = axis === 'vertical';
  const lattice = enumerateLattice({
    min: isVertical ? canonical.minX : canonical.minY,
    max: isVertical ? canonical.maxX : canonical.maxY,
    spacing: line.spacing,
    origin: line.origin,
    includeBoundary: line.includeBoundary,
  });

  lattice.forEach(item => {
    const from: [number, number] = isVertical ? [item.value, bounds.lineMinY] : [bounds.lineMinX, item.value];
    const to: [number, number] = isVertical ? [item.value, bounds.lineMaxY] : [bounds.lineMaxX, item.value];
    const resolvedStyle = isMajorLine(item.index, line.major) ? { ...line.style, ...line.major?.style } : line.style;
    paths.push(createGridLinePath(from, to, resolvedStyle));
  });
};

const isMajorLine = (index: number | undefined, major: GridLineConfig['major']): boolean => {
  if (major === undefined || index === undefined) return false;
  return (((index - major.offset) % major.every) + major.every) % major.every === 0;
};

const createGridLinePath = (
  from: [number, number],
  to: [number, number],
  style: IRStandardPathStrokeStyle | undefined,
): IRPath => {
  const { zIndex, ...appearance } = style ?? {};
  return {
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(style === undefined ? {} : { style: appearance }),
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: from },
      { type: 'step', kind: 'line', to },
    ],
  };
};

const createGridBorderPath = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  padding: number,
  style: IRStandardPathBorderStyle | undefined,
): IRPath => {
  const { zIndex, ...appearance } = style ?? {};
  return {
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(style === undefined ? {} : { style: appearance }),
    type: 'path',
    children: [
      {
        type: 'step',
        kind: 'rectangle',
        from: [minX - padding, minY - padding],
        to: [maxX + padding, maxY + padding],
      },
    ],
  };
};
