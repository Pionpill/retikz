import type { AnyCompositeDefinition } from '../contract';
import type { IRScene } from '../schemas';
import { createFullCompileContext } from './context';
import { CompileManager } from './orchestration';
import type { CompileProvenanceSnapshot } from './provenance';
import type { CompileOptions, CompileResult, CompositeArtifactOf } from './types';
import type { CompileWarning } from './warning';
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
      if (__DEV__) {
        console.warn(formatCompileWarning(warning));
      }
    });
  diagnostics.forEach(warningSink);
};

/**
 * 单次静态编译的产物、诊断与可选来源信息
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export type SceneCompilationSnapshot<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** 完整 compile result */
  result: CompileResult<CompositeArtifactOf<TComposites[number]>>;
  /** 仅在完整 compile 成功后可提交的 canonical warnings */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** 按需收集的编译来源信息 */
  provenance?: CompileProvenanceSnapshot;
}>;

/** 编译执行时的运行配置项 */
export type ExecuteOptions = Readonly<{
  /** 是否收集编译来源信息，默认不收集 */
  captureProvenance?: boolean;
}>;

/**
 * 执行一次不派发 warning 的完整 Core compile
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const compileSceneSnapshot = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  compileOptions?: Omit<CompileOptions<TComposites>, 'onWarn'>,
  executeOptions: ExecuteOptions = {},
): SceneCompilationSnapshot<TComposites> => {
  const context = createFullCompileContext(ir, compileOptions ?? {});
  return new CompileManager(context).compileScene<TComposites>(ir, compileOptions?.padding, executeOptions);
};

/**
 * IR → Scene 纯函数转换，所有 adapter 共享
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const compileToScene = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  options?: CompileOptions<TComposites>,
): CompileResult<CompositeArtifactOf<TComposites[number]>> => {
  const snapshot = compileSceneSnapshot(ir, options);
  dispatchCompileDiagnostics(snapshot.diagnostics, options?.onWarn);
  return snapshot.result;
};
