import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { CompileOptions, ExecuteOptions, SceneCompilationSnapshot } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

/** 在独立测试会话中取得完整编译快照，结束后释放执行状态 */
export const compileTestSnapshot = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  source: IRScene,
  options: CompileOptions<TComposites> = {},
  execution: ExecuteOptions = {},
): SceneCompilationSnapshot<TComposites> => {
  const reconciler = new SceneReconciler(options, { ...execution, incremental: false });
  try {
    return reconciler.mount(source).compilation;
  } finally {
    reconciler.dispose();
  }
};

/** 使用真实协调器构造测试所需的 Scene 与领域产物 */
export const compileTestResult = <const TComposites extends ReadonlyArray<AnyCompositeDefinition> = readonly []>(
  source: IRScene,
  options: CompileOptions<TComposites> = {},
): SceneCompilationSnapshot<TComposites>['result'] => compileTestSnapshot(source, options).result;
