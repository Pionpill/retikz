import type { AnyCompositeDefinition } from '../contract';
import type { IRScene } from '../schemas';
import { createFullCompileContext } from './context';
import type { CompileWarning, CompositeArtifactOf } from './shared';
import { formatCompileWarning } from './shared';
import { CompileManager } from './tree';
import type { ExecuteOptions, SceneCompilationSnapshot, CompileOptions, CompileResult } from './types';

export { BuiltinCompileWarningCode, type CompileWarningCode } from './shared';
export type {
  CompileCompositeOptions,
  CompileHostOptions,
  CompileLayoutOptions,
  CompileOptions,
  CompileProviderOptions,
  CompileResult,
} from './types';
export type { CompileWarning, CompositeArtifact } from './shared';

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
