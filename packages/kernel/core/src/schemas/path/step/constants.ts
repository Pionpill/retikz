import type { ValueOf } from '../../../types';

export const GeometryLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

export const FoldStepVia = {
  HorizontalThenVertical: '-|',
  VerticalThenHorizontal: '|-',
} as const;

export type GeometryLabelPlacementValue = ValueOf<typeof GeometryLabelPlacement>;

export type FoldStepViaValue = ValueOf<typeof FoldStepVia>;
