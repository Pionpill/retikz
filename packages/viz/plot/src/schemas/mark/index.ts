export { AnchorIdSchema, PlotTargetEncodingSchema, PlotTargetRefSchema } from './anchor';
export type { IRPlotAnchorId, IRPlotTargetRef } from './anchor';
export { BuiltinPlotMark, MarkTransformSchema, MarkValueKind } from './base';
export type { IRPlotMarkTransform } from './base';
export * from './interval';
export { MarkNodeLabelListSchema, MarkNodeLabelSchema, MarkPathLabelListSchema, MarkPathLabelSchema } from './label';
export type {
  IRPlotMarkNodeLabel,
  IRPlotMarkNodeLabelList,
  IRPlotMarkPathLabel,
  IRPlotMarkPathLabelList,
} from './label';
export * from './mark';
export * from './path';
export * from './point';
export * from './relation';
