import type { AnyCompositeDefinition } from '../contract';
import type { IRScene } from '../schemas';
import {
  compileChildrenToPrimitives,
  createCompileContext,
  createCompileProvenanceTracker,
  orderCompileWarnings,
} from './orchestration';
import { assemblePreparedScene } from './output';
import type { CompileProvenance } from './provenance';
import type { CompileOptions, CompileResult, CompositeArtifactOf } from './types';
import type { CompileWarning, InputCompileWarning } from './warning';
import { formatCompileWarning } from './warning';

export { BuiltinCompileWarningCode, type CompileWarningCode } from './constants';
export type {
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
  CompileResult,
  CompositeArtifact,
} from './types';
export type { CompileWarning } from './warning';

/** 把完整编译产生的 canonical warning 派发到调用方或默认开发期出口 */
const dispatchCompileDiagnostics = (
  diagnostics: ReadonlyArray<CompileWarning>,
  onWarn: CompileOptions['onWarn'],
): void => {
  const warningSink =
    onWarn ??
    ((warning: CompileWarning): void => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return;
      console.warn(formatCompileWarning(warning));
    });
  diagnostics.forEach(warningSink);
};

/**
 * 单次静态编译的产物、诊断与可选来源信息
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type PreparedSceneCompilation<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 仅在完整 compile 成功后可提交的 canonical warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** 按需收集的编译来源信息 */
  provenance?: CompileProvenance;
}>;

/** 单次静态编译的准备选项 */
export type SceneCompilationPreparationOptions = Readonly<{
  /** 是否收集编译来源信息，默认不收集 */
  captureProvenance?: boolean;
}>;

/**
 * 执行一次不派发 warning 的完整 Core compile
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const prepareSceneCompilation = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: Omit<CompileOptions<TComposites>, 'onWarn'>,
  execution: SceneCompilationPreparationOptions = {},
): PreparedSceneCompilation<TComposites> => {
  const diagnostics: Array<InputCompileWarning> = [];
  const context = createCompileContext(ir, {
    ...(options ?? {}),
    onWarn: warning => diagnostics.push(warning),
  });
  const { loweredIr, paint, clip } = context;
  const provenanceTracker = execution.captureProvenance === true ? createCompileProvenanceTracker() : undefined;

  const { primitives, layoutBounds, artifacts } = compileChildrenToPrimitives(loweredIr.children, context, {
    ...(provenanceTracker === undefined ? {} : { provenanceTracker }),
  });
  const resources = [...paint.resources(), ...clip.resources()];
  const prepared = assemblePreparedScene<TComposites>(loweredIr, primitives, resources, layoutBounds, context, {
    artifacts,
    diagnostics: orderCompileWarnings(diagnostics),
    ...(provenanceTracker === undefined ? {} : { provenance: provenanceTracker.capture(primitives) }),
  });

  return prepared;
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const compileToScene = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
): CompileResult<CompositeArtifactOf<TComposites[number]>> => {
  const snapshot = prepareSceneCompilation(ir, options);
  dispatchCompileDiagnostics(snapshot.diagnostics, options?.onWarn);
  return snapshot.result;
};
