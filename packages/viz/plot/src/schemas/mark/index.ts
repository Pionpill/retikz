export {
  AnchorIdSchema,
  MarkKeyInputSchema,
  MarkTargetSchema,
  PathEndpointSchema,
  PlotTargetEncodingSchema,
  PlotTargetRefSchema,
} from './anchor';
export type { IRPlotAnchorId, IRPlotMarkTarget, IRPlotPathEndpoint, IRPlotTargetRef } from './anchor';
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
export * from './path-step';
export * from './point';
export * from './relation';
