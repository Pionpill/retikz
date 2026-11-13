import type { AnyCompositeDefinition, IRScene } from '@retikz/core';

import type { SceneCompilationSnapshot } from './compile';
import { assembleCompileSubtree, finalizeSceneCompilation } from './compile/execution';
import type { CompileRuntime } from './compile/runtime';

/** 非增量 Scene 的完整遍历与快照组装，不保留跨批计算状态 */
export const compileScene = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
): SceneCompilationSnapshot<TComposite> =>
  finalizeSceneCompilation<TComposite>(root, runtime, assembleCompileSubtree(root.children, runtime));
