import type { AnyCompositeDefinition, CompileWarning, IRScene } from '@retikz/core';
import { formatCompileWarning } from '@retikz/core';

import { createCompileRuntime } from './runtime';
import type { CompositeArtifactOf } from './shared';
import { CompileManager } from './tree';
import type { ExecuteOptions, SceneCompilationSnapshot, CompileOptions, CompileResult } from './types';

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
 * 执行一次不派发 warning 的完整编译
 * @template TComposites 本次编译使用的复合组件定义集合，用于保留输出产物的精确类型
 */
export const compileSceneSnapshot = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  ir: IRScene,
  compileOptions?: Omit<CompileOptions<TComposites>, 'onWarn'>,
  executeOptions: ExecuteOptions = {},
): SceneCompilationSnapshot<TComposites> => {
  const runtime = createCompileRuntime(ir, compileOptions ?? {}, executeOptions);
  return new CompileManager(runtime).compileScene<TComposites>(ir);
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
