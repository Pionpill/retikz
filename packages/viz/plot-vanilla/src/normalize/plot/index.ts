export type { ResolvedPlotExtensionAuthoring } from './build-plot-spec';
export type { InputPlotAuthoring } from './build-plot-spec';
export {
  decorateDefaultGuides,
  normalizePlotAuthoring,
  normalizePlotSpec,
  resolveLabelOf,
  resolvePlotExtensionAuthoring,
} from './build-plot-spec';
export type {
  BuildPlotSpecOptions,
  CollectionContext,
  CoordinateInput,
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
  ScaffoldTrackSpec,
} from './contracts';
export type { PlotDeclarationErrorCodeValue, PlotDeclarationErrorDetails } from './errors';
export { PlotDeclarationError, PlotDeclarationErrorCode } from './errors';
export type { InputPlot, InputPlotFacet, InputPlotGuide, InputPlotMark, InputPlotScaffold } from './input';
export type { InputFacet, InputScaffold, InputTrack } from './input-composition';
export type { InputAxis, InputLegend } from './input-guides';
export type {
  InputCoreNodeChannels,
  InputCorePathChannels,
  InputDatumLabel,
  InputExtensionChannel,
  InputFieldName,
  InputIntervalMark,
  InputPathMark,
  InputPointMark,
  InputReferenceMark,
  InputRelationMark,
} from './input-marks';
export type { InputPositionScaleType, InputScale, InputScaleDimension } from './input-scales';
export type { InputTransform } from './input-transform';
export { inputPlotFromSpec, normalizePlot, normalizePlotDeclarations } from './normalize';
