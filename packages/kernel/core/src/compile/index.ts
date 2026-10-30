export { createCompileChildPath, formatCompileOccurrence } from './artifact';
export { compileSceneSnapshot, compileToScene } from './compile';
export { BuiltinCompileWarningCode, type CompileWarningCode } from './constants';
export { samplePathRoute } from './path';
export { computeLayout } from './scene';
export { fallbackMeasurer } from './text';
export type {
  LoweredTex,
  LoweredTexPaint,
  LoweredTexPath,
  TexLowerer,
  TextFont,
  TextMeasurer,
  TextMetrics,
} from './text';
export type {
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
  CompileResult,
  CompositeArtifact,
  CompositeArtifactOf,
} from './types';
export type { CompileWarning } from './warning';

export { formatCompileWarning } from './warning';

export type { ExecuteOptions, SceneCompilationSnapshot } from './compile';
export { createSharedCompileContext, resolveScopeContext } from './context';
export type {
  CompileContextHost,
  CompileContextLayout,
  CompileContextLimits,
  CompileContextRegistries,
  ElementCompileContext,
  ElementCompileOptions,
  ElementCompileReference,
  ElementCompileResult,
  SharedCompileContext,
  SharedCompileContextOptions,
} from './context';
export { compileCoordinate } from './coordinate';
export type { CompiledCoordinate, CoordinateCompileContext } from './coordinate';
export { compileNode } from './node';
export type { CompiledNode, NodeCompileContext } from './node';
export * from './output';
export { compilePath } from './path';
export type { CompiledPath, PathElementCompileContext } from './path';
export * from './provenance';
export { projectCompileReference, projectPublishedCompileLayout, projectScopeCompileLayouts } from './reference';
export type { CompileReferenceSource } from './reference';
export { assembleSceneCompilationSnapshot } from './scene';
export type { InputSceneCompilationSnapshot } from './scene';
export { assembleScopeOutput, compileScope, prepareScopeCompilation } from './scope';
export type { CompiledScope, ScopeCompilationPreparation, ScopeCompileContext } from './scope';

export type { CompiledNodeLayout, NodeCompilation, NodeLabelResolution, NodeResolvedProperties } from './node';

export { createDuplicateCompileWarning } from './diagnostics';
