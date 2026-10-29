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
export * from './element';
export { createSharedCompileContext } from './context';
export type {
  CompileContextHost,
  CompileContextLayout,
  CompileContextLimits,
  CompileContextRegistries,
  SharedCompileContext,
  SharedCompileContextOptions,
} from './context';
export { assembleSceneCompilation } from './output';
export type { SceneCompilationMetadata } from './output';
export * from './provenance';

export type { CompiledNodeLayout, NodeCompilation, NodeLabelResolution, NodeResolvedProperties } from './node';
