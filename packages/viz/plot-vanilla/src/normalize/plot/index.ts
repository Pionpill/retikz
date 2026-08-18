export type { ResolvedPlotExtensionAuthoring } from './build-plot-spec';
export {
  decorateDefaultGuides,
  normalizePlotIR,
  resolveLabelOf,
  resolvePlotExtensionAuthoring,
} from './build-plot-spec';
export type {
  BuildPlotOptions,
  CollectionContext,
  InputPlotCoordinate,
  MarkTransformShortcutContext,
  MarkTransformShortcutDefinition,
  PlotAuthoringContext,
  PlotAuthoringDeclaration,
  PlotAuthoringDeclarations,
  PlotAuthoringRuntime,
  PlotAuthoringRuntimeSource,
  PlotComposition,
  PlotDeclarationCollection,
  PlotDeclarationKind,
  PlotDeclarationPath,
  PlotDeclarationSource,
  PlotMemberFragment,
  ResolveLabelMap,
  ScaffoldTrack,
} from './contracts';
export type { RetikzPlotDeclarationErrorCodeValue, RetikzPlotDeclarationErrorDetails } from './errors';
export { RetikzPlotDeclarationError, RetikzPlotDeclarationErrorCode } from './errors';
export type { InputPlot, InputPlotFacet, InputPlotGuide, InputPlotMark, InputPlotScaffold } from './input';
export type { InputPlotFacetDimension, InputPlotTrack } from './input-composition';
export type { InputPlotAxis, InputPlotLegend } from './input-guides';
export type {
  InputPlotCoreNodeChannels,
  InputPlotCorePathChannels,
  InputPlotDatumLabel,
  InputPlotExtensionChannel,
  InputPlotFieldName,
  InputPlotIntervalMark,
  InputPlotMarkGeometryLabel,
  InputPlotMarkNodeLabel,
  InputPlotPathMark,
  InputPlotPointMark,
  InputPlotReferenceMark,
  InputPlotRelationMark,
  InputPlotRelationPathGeometry,
  InputPlotRelationRouteStep,
  InputPlotRelationStepLabel,
} from './input-marks';
export type { InputPlotPositionScaleType, InputPlotScale, InputPlotScaleDimension } from './input-scales';
export { normalizePlot, normalizePlotDeclarations } from './normalize';
