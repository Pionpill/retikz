export { createCompileChildPath, formatCompileOccurrence } from './artifact';
export { compileSceneSnapshot, compileToScene } from './compile';
export { BuiltinCompileWarningCode, type CompileWarningCode } from './constants';
export { createSharedCompileContext } from './context';
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
export { createDuplicateCompileWarning } from './diagnostics';
export * from './output';
export * from './provenance';
export { projectCompileReference, projectPublishedCompileLayout, projectScopeCompileLayouts } from './reference';
export type { CompileReferenceSource } from './reference';
export { assembleSceneCompilationSnapshot, computeLayout } from './scene';
export type { InputSceneCompilationSnapshot } from './scene';
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
export { compileCoordinate } from './tree/coordinate';
export type { CompiledCoordinate, CoordinateCompileContext } from './tree/coordinate';
export { compileNode } from './tree/node';
export type {
  CompiledNode,
  CompiledNodeLayout,
  NodeCompilation,
  NodeCompileContext,
  NodeLabelResolution,
  NodeResolvedProperties,
} from './tree/node';
export { compilePath, samplePathRoute } from './tree/path';
export type { CompiledPath, PathElementCompileContext } from './tree/path';
export { assembleScopeOutput, compileScope, prepareScopeCompilation, resolveScopeContext } from './tree/scope';
export type { CompiledScope, ScopeCompilationPreparation, ScopeCompileContext } from './tree/scope';
export type {
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
  CompileResult,
  CompositeArtifact,
  CompositeArtifactOf,
  ExecuteOptions,
  SceneCompilationSnapshot,
} from './types';
export { formatCompileWarning } from './warning';
export type { CompileWarning } from './warning';
