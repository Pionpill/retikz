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
  Sloped: 'sloped',
} as const;

export const GeometryLabelSideAlias = {
  top: GeometryLabelSide.Above,
  bottom: GeometryLabelSide.Below,
  left: GeometryLabelSide.Left,
  right: GeometryLabelSide.Right,
} as const satisfies Record<WebSideValue, (typeof GeometryLabelSide)[keyof typeof GeometryLabelSide]>;

const GeometryLabelSideSet = new Set<string>(Object.values(GeometryLabelSide));

export const normalizeGeometryLabelSide = (name: string): (typeof GeometryLabelSide)[keyof typeof GeometryLabelSide] | undefined => {
  if (GeometryLabelSideSet.has(name)) return name as (typeof GeometryLabelSide)[keyof typeof GeometryLabelSide];
  const webSide = normalizeWebSide(name);
  return webSide === undefined ? undefined : GeometryLabelSideAlias[webSide];
};

export const FoldStepVia = {
  HorizontalThenVertical: '-|',
  VerticalThenHorizontal: '|-',
} as const;
