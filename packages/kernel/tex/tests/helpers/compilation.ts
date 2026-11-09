import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type { CompileOptions, ExecuteOptions, SceneCompilationSnapshot } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

/** 在独立测试会话中取得完整编译快照，结束后释放执行状态 */
export const compileTestSnapshot = <const TComposite extends AnyCompositeDefinition = never>(
  source: IRScene,
  options: CompileOptions<TComposite> = {},
  execution: ExecuteOptions = {},
): SceneCompilationSnapshot<TComposite> => {
  const reconciler = new SceneReconciler(options, { ...execution, incremental: false });
  try {
    return reconciler.mount(source).compilation;
  } finally {
    reconciler.dispose();
  }
};

/** 使用真实协调器构造测试所需的 Scene 与领域产物 */
export const compileTestResult = <const TComposite extends AnyCompositeDefinition = never>(
  source: IRScene,
  options: CompileOptions<TComposite> = {},
): SceneCompilationSnapshot<TComposite>['result'] => compileTestSnapshot(source, options).result;
