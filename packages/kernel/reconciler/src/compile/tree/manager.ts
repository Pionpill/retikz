import type { AnyCompositeDefinition, IRScene } from '@retikz/core';

import { assembleCompileSubtree, finalizeSceneCompilation } from '../execution';
import type { CompileRuntime } from '../runtime';
import type { SceneCompilationSnapshot } from '../types';

/** 管理一次全量编译及其隔离试编译的会话、执行环境和最终快照 */
export class CompileManager {
  constructor(private readonly runtime: CompileRuntime) {}

  /** 完成根子树并组装 Scene；padding 只在最终组装时使用 */
  compileScene<TComposite extends AnyCompositeDefinition>(root: IRScene): SceneCompilationSnapshot<TComposite> {
    return finalizeSceneCompilation<TComposite>(
      root,
      this.runtime,
      assembleCompileSubtree(root.children, this.runtime),
    );
  }
}
