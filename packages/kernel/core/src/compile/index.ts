export { formatCompileChildPath, formatCompileOccurrence } from './artifact';
export { compileToScene, prepareSceneCompilation } from './compile';
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

export type { PreparedSceneCompilation, SceneCompilationPreparationOptions } from './compile';
export * from './element';
export * from './environment';
export { assembleSceneCompilation } from './output';
export type { SceneCompilationMetadata } from './output';
export * from './provenance';

export type { CompiledNodeLayout, NodeCompilation, NodeLabelResolution, NodeResolvedProperties } from './node';
export { createCompileProvenanceTracker } from './orchestration';
export type { CompileProvenanceTracker } from './orchestration';
