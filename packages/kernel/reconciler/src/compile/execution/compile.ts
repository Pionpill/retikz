import type { AnyCompositeDefinition, IRScene } from '@retikz/core';

import type { CompileRuntime } from '../runtime';
import type { SceneCompilationSnapshot } from '../types';
import { assembleCompileSubtree, finalizeSceneCompilation } from './assemble';

/** 完整编译根子树并组装 Scene 快照；padding 只在最终组装时使用 */
export const compileScene = <TComposite extends AnyCompositeDefinition>(
  root: IRScene,
  runtime: CompileRuntime,
): SceneCompilationSnapshot<TComposite> =>
  finalizeSceneCompilation<TComposite>(root, runtime, assembleCompileSubtree(root.children, runtime));
