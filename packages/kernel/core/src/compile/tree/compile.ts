import type { AnyCompositeDefinition } from '../../contract';
import type { IRChild, IRScene } from '../../schemas';
import type { FullCompileContext } from '../context';
import { CompileProvenanceTracker } from '../provenance';
import { assembleSceneCompilationSnapshot } from '../scene';
import type { ExecuteOptions, SceneCompilationSnapshot, CompileOptions } from '../types';
import { CompositeCompileSession } from './composite/session';
import { createTreeExecutionContext } from './context';
import { SubtreeCompiler } from './traversal';
import type { SubtreeCompilation, SubtreeCompileOptions } from './types';

/** 管理一次全量编译及其隔离试编译的会话、执行环境和最终快照 */
export class CompileManager {
  constructor(
    private readonly context: FullCompileContext,
    /** 仅在当前根调用与其 probe 之间共享的句柄和测量缓存 */
    private readonly compositeSession = new CompositeCompileSession(),
  ) {}

  /** 完成根子树并组装 Scene；padding 只在最终组装时使用 */
  compileScene<TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
    root: IRScene,
    padding: CompileOptions['padding'],
    options: ExecuteOptions,
  ): SceneCompilationSnapshot<TComposites> {
    const provenanceTracker = options.captureProvenance === true ? new CompileProvenanceTracker() : undefined;
    const { primitives, layoutBounds, artifacts } = this.compileSubtree(root.children, { provenanceTracker });
    const { paintRegistry, clipRegistry, diagnostics } = this.context.workspace;
    return assembleSceneCompilationSnapshot<TComposites>({
      root,
      primitives,
      resources: [...paintRegistry.resources(), ...clipRegistry.resources()],
      layoutBounds,
      round: this.context.shared.layout.round,
      artifacts,
      diagnostics: diagnostics.warnings,
      provenanceTracker,
      padding,
    });
  }

  /** 编译子树，默认使用根工作区；probe 显式提供隔离上下文并共享当前会话 */
  compileSubtree(
    children: ReadonlyArray<IRChild>,
    options: SubtreeCompileOptions = {},
    context: FullCompileContext = this.context,
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
    const executionContext = createTreeExecutionContext(context, this.compositeSession, options);
    return new SubtreeCompiler(
      children,
      executionContext,
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
          theme: context.theme,
          compositeInputs: context.compositeInputs,
        },
      },
    ).run();
  }
}
