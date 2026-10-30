import type { AnyCompositeDefinition, CompileOccurrenceLocator } from '../../contract';
import type { IRChild, IRScene } from '../../schemas';
import type { ExecuteOptions, SceneCompilationSnapshot } from '../compile';
import type { FullCompileContext } from '../context';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../diagnostics';
import { NamespaceStack } from '../namespace';
import { CompileProvenanceTracker } from '../provenance';
import { assembleSceneCompilationSnapshot } from '../scene';
import { ScopeTransformComposer } from '../transform';
import type { CompileOptions } from '../types';
import type { InputCompileWarning } from '../warning';
import { CompositeCompileSession } from './composite/session';
import { ScopeCompiler } from './scope';
import type {
  CompileExecutionContext,
  SubtreeCompilation,
  SubtreeCompileOptions,
  WithCompileWarningOccurrence,
} from './types';

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
      namespaceStack,
      provenanceTracker,
      observeWarningOccurrence,
      probe,
      measurementAxis,
      captureScopeTargets,
      ...initial
    } = options;
    const { dispatchWarning, withWarningOccurrence } = this.createWarningScope(
      context.workspace.diagnostics,
      observeWarningOccurrence,
    );
    const executionContext: CompileExecutionContext = {
      shared: context.shared,
      workspace: {
        ...context.workspace,
        diagnostics: { ...context.workspace.diagnostics, collect: dispatchWarning },
      },
      compositeSession: this.compositeSession,
      namespaceStack:
        namespaceStack ??
        new NamespaceStack({
          rootIdentity: provenanceTracker?.rootNamespace,
          onDuplicate: info => dispatchWarning(createDuplicateWarning(info)),
        }),
      provenanceTracker,
      scopeTransformComposer: new ScopeTransformComposer(),
      withWarningOccurrence,
    };
    return new ScopeCompiler(
      children,
      executionContext,
      {
        compileSubtree: this.compileSubtree.bind(this),
      },
      {
        probe,
        measurementAxis,
        captureScopeTargets,
        initial: { ...initial, theme: context.theme, compositeInputs: context.compositeInputs },
      },
    ).run();
  }

  /** 为单次执行创建诊断来源栈，收集时补充当前位置，退出子项时恢复父来源 */
  private createWarningScope(
    diagnostics: FullCompileContext['workspace']['diagnostics'],
    observeWarningOccurrence: SubtreeCompileOptions['observeWarningOccurrence'],
  ) {
    const warningOccurrences: Array<CompileOccurrenceLocator> = [];
    const dispatchWarning = (warning: InputCompileWarning): void => {
      diagnostics.collect(withCompileWarningOccurrence(warning, warningOccurrences.at(-1)));
    };
    const withWarningOccurrence: WithCompileWarningOccurrence = (occurrence, execute) => {
      warningOccurrences.push(occurrence);
      observeWarningOccurrence?.(occurrence);
      try {
        return execute();
      } finally {
        warningOccurrences.pop();
        observeWarningOccurrence?.(warningOccurrences.at(-1));
      }
    };
    return { dispatchWarning, withWarningOccurrence };
  }
}
