import type { AnyCompositeDefinition } from '../../contract';
import type { IRChild, IRScene } from '../../schemas';
import type { CompileRuntime } from '../runtime';
import { assembleSceneCompilationSnapshot } from '../scene';
import type { SceneCompilationSnapshot } from '../types';
import { SubtreeCompiler } from './subtree';
import type { SubtreeCompilation, SubtreeCompileOptions } from './types';

/** 管理一次全量编译及其隔离试编译的会话、执行环境和最终快照 */
export class CompileManager {
  constructor(private readonly runtime: CompileRuntime) {}

  /** 完成根子树并组装 Scene；padding 只在最终组装时使用 */
  compileScene<TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
    root: IRScene,
  ): SceneCompilationSnapshot<TComposites> {
    const { primitives, layoutBounds, artifacts } = this.compileSubtree(root.children);
    const { paintRegistry, clipRegistry, diagnosticCollector } = this.runtime.state.workspace;
    return assembleSceneCompilationSnapshot<TComposites>({
      root,
      primitives,
      resources: [...paintRegistry.getResources(), ...clipRegistry.getResources()],
      layoutBounds,
      round: this.runtime.context.layout.round,
      artifacts,
      diagnostics: diagnosticCollector.warnings,
      provenanceTracker: this.runtime.state.execution.provenanceTracker,
      padding: this.runtime.context.padding,
    });
  }

  /** 编译子树，默认使用根工作区；probe 显式提供隔离上下文并共享当前会话 */
  private compileSubtree(
    children: ReadonlyArray<IRChild>,
    options: SubtreeCompileOptions = {},
    runtime: CompileRuntime = this.runtime,
  ): SubtreeCompilation {
    const {
      probe,
      measurementAxis,
      captureScopeTargets,
      scopeChain,
      scopeDefaults,
      occurrence,
      compositeDepth,
      generated,
      proposal,
    } = options;
    return new SubtreeCompiler(
      children,
      runtime,
      {
        compileSubtree: this.compileSubtree.bind(this),
      },
      {
        probe,
        measurementAxis,
        captureScopeTargets,
        initial: {
          scopeChain,
          scopeDefaults,
          occurrence,
          compositeDepth,
          generated,
          proposal,
          theme: runtime.context.theme,
          compositeInputs: runtime.context.compositeInputs,
        },
      },
    ).run();
  }
}
