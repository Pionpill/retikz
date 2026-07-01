import type { WebSideValue } from '../../../geometry/anchor';

import { normalizeWebSide } from '../../../geometry/anchor';

export const GeometryLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

export const GeometryLabelSide = {
  Above: 'above',
  Below: 'below',
  Left: 'left',
  Right: 'right',
} as const;

export const GeometryLabelSideAlias = {
  top: GeometryLabelSide.Above,
  bottom: GeometryLabelSide.Below,
  left: GeometryLabelSide.Left,
  right: GeometryLabelSide.Right,
} as const satisfies Record<WebSideValue, (typeof GeometryLabelSide)[keyof typeof GeometryLabelSide]>;

export const normalizeGeometryLabelSide = (name: string): (typeof GeometryLabelSide)[keyof typeof GeometryLabelSide] | undefined => {
  const webSide = normalizeWebSide(name);
  if (webSide !== undefined) return GeometryLabelSideAlias[webSide];
  if (name === GeometryLabelSide.Above || name === GeometryLabelSide.Below) return name;
  return undefined;
};

export const FoldStepVia = {
  HorizontalThenVertical: '-|',
  VerticalThenHorizontal: '|-',
} as const;
