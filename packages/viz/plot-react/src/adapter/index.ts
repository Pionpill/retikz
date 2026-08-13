export type { ResolvedPlotExtensionAuthoring } from './build-plot-spec';
export { buildPlotSpec, decorateDefaultGuides, resolveLabelOf, resolvePlotExtensionAuthoring } from './build-plot-spec';
export { collectPlotDeclarations } from './collector';
export type {
  BuildPlotSpecOptions,
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
  PlotDeclarationPath,
  PlotDeclarationSource,
  PlotMemberFragment,
  ResolveLabelMap,
} from './contracts';
export type { PlotDeclarationErrorCodeValue } from './errors';
export { PlotDeclarationError, PlotDeclarationErrorCode } from './errors';
export { normalizePlotDeclarations } from './normalize';
