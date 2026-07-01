import type { WebSideValue } from '../../../geometry/anchor';

import { normalizeWebSide } from '../../../geometry/anchor';

export const GeometryLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

export const normalizeGeometryLabelSide = (name: string): WebSideValue | undefined =>
  normalizeWebSide(name);

export const FoldStepVia = {
  HorizontalThenVertical: '-|',
  VerticalThenHorizontal: '|-',
} as const;
