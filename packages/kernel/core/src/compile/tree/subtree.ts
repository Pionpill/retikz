import type { CompileOccurrenceLocator, ScenePrimitive } from '../../contract';
import { CompileExpansionKind, naturalLayoutProposal, selectCompositeInputScope } from '../../contract';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
} from '../../resolve/diagnostics';
import type { IRChild } from '../../schemas';
import type { TreeCompileContext } from '../context';
import type { CompileOwnerKey } from '../provenance';
import { collectLayoutBounds } from '../scene';
import {
  createCompileChildPath,
  createCompileInvariantError,
  enrichLayoutProbeError,
  orderCompileArtifacts,
} from '../shared';
import { resolveStructuralAlignmentGuides } from './alignment-guide';
import { effectiveAllocations } from './allocation';
import { CompositeCompiler } from './composite';
import { visitCoordinate } from './coordinate/visit';
import { createCompileSinks } from './frame';
import type { TreeCompileFrame } from './frame';
import { visitNode } from './node/visit';
import { acceptTreeContribution, collectPlaceholderLocators, stableSortByZIndex } from './output';
import type { TreeOutputState } from './output';
import { queuePathChild, flushPendingPathEmissions } from './path/deferred';
import { visitScope } from './scope/visit';
import type { SubtreeCompileHost, SubtreeCompilerOptions, SubtreeCompilation } from './types';

/** 编译任意子树，调度各元素处理并汇总结果 */
export class SubtreeCompiler {
  /** 当前执行的输出记录 */
  private readonly output: TreeOutputState = { zIndexOf: new WeakMap(), pendingPathCount: 0 };

  /** 首次遇到复合组件时创建，同次子树执行复用 */
  private compositeCompiler: CompositeCompiler | undefined;

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly context: TreeCompileContext,
    private readonly host: SubtreeCompileHost,
    private readonly options: SubtreeCompilerOptions,
  ) {}

  /** 按需建立复合组件执行器及其宿主回调 */
  private getOrCreateCompositeCompiler(): CompositeCompiler {
    return (this.compositeCompiler ??= new CompositeCompiler(
      this.context,
      {
        compileSubtree: this.host.compileSubtree,
        acceptContribution: (frame, contribution) => acceptTreeContribution(this.output, frame, contribution),
        compileChild: (...args) => this.compileChild(...args),
        compileScopeChild: (...args) =>
          visitScope(
            this.context,
            this.output,
            { compileChildren: this.compileChildren.bind(this) },
            this.options,
            ...args,
          ),
      },
      {
        rootChild: this.rootChildren[0],
        probe: this.options.probe,
        measurementAxis: this.options.measurementAxis,
      },
    ));
  }

  /** 编译当前子树并完成延迟输出与边界收集 */
  run(): SubtreeCompilation {
    const {
      primitiveSink: rootPrimitives,
      pathSink: rootPendingPaths,
      boundsSink: rootBounds,
      allocationSink: rootAllocations,
      layoutSink: rootLayouts,
      artifactSink: rootArtifacts,
      alignmentGuideSink: rootAlignmentGuides,
    } = createCompileSinks();

    this.compileChildren(
      this.rootChildren,
      {
        childProposal: this.options.initial.proposal ?? naturalLayoutProposal,
        runtimeInputs: this.options.initial.compositeInputs,
        scopeChain: this.options.initial.scopeChain ?? [],
        primitiveSink: rootPrimitives,
        locatorPrefix: [],
        layoutSink: rootLayouts,
        pathSink: rootPendingPaths,
        scopeDefaults: this.options.initial.scopeDefaults ?? {},
        theme: this.options.initial.theme,
        publicationSink: [],
        boundsSink: rootBounds,
        allocationSink: rootAllocations,
        alignmentGuideSink: rootAlignmentGuides,
        artifactSink: rootArtifacts,
        ...(this.context.execution.provenanceTracker === undefined
          ? {}
          : { semanticOwner: this.context.execution.provenanceTracker.root }),
      },
      true,
    );

    flushPendingPathEmissions(this.context, this.output, rootPendingPaths);

    let layoutBounds: SubtreeCompilation['layoutBounds'];
    for (const contribution of rootBounds) {
      layoutBounds = collectLayoutBounds(layoutBounds, contribution.boundsPoints, contribution.shadow);
    }

    if (this.output.pendingPathCount !== 0) {
      const detail = __DEV__ ? ` at ${collectPlaceholderLocators(rootPrimitives).join(', ')}` : '';
      throw createCompileInvariantError(
        `internal: ${this.output.pendingPathCount} unresolved path placeholder(s) leaked into Scene output${detail}`,
      );
    }

    // 延迟路径已回填，输出容器中不再包含占位项
    const primitives = stableSortByZIndex(rootPrimitives as Array<ScenePrimitive>, this.output.zIndexOf);

    const alignmentGuides = resolveStructuralAlignmentGuides(rootAlignmentGuides);

    return {
      primitives,
      primitiveZIndices: primitives.map(primitive => this.output.zIndexOf.get(primitive)),
      ...(this.compositeCompiler?.rootContribution === undefined
        ? {}
        : { contribution: this.compositeCompiler.rootContribution }),
      layoutBounds,
      layouts: rootLayouts,
      bounds: rootBounds,
      allocations: effectiveAllocations(rootAllocations),
      artifacts: orderCompileArtifacts(rootArtifacts),
      ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
    };
  }

  private compileChild(
    child: IRChild,
    index: number,
    frame: TreeCompileFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ): void {
    try {
      this.context.execution.withWarningOccurrence(occurrence, () => {
        if ('namespace' in child) {
          this.getOrCreateCompositeCompiler().compile(child, index, frame, occurrence, compositeDepth, semanticOwner);
          return;
        }

        switch (child.type) {
          case 'node':
            visitNode(this.context, this.output, child, index, frame, occurrence, semanticOwner);
            break;
          case 'coordinate':
            visitCoordinate(this.context, child, index, frame);
            break;
          case 'scope':
            visitScope(
              this.context,
              this.output,
              { compileChildren: this.compileChildren.bind(this) },
              this.options,
              child,
              index,
              frame,
              generated ? occurrence : undefined,
              compositeDepth,
              semanticOwner,
            );
            break;
          default:
            queuePathChild(this.context, this.output, child, index, frame, occurrence, semanticOwner);
        }
      });
    } catch (thrown) {
      if (isFatalProbeError(thrown)) throw thrown;

      const providerKey = 'namespace' in child ? `${child.namespace}.${child.type}` : child.type;
      if (isLayoutProbeRecoverableError(thrown)) {
        throw enrichLayoutProbeError(thrown, providerKey, occurrence);
      }

      throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Child compilation threw a non-Error value'), {
        cause: thrown,
        providerKey,
        occurrence,
      });
    }
  }

  private compileChildren(
    children: ReadonlyArray<IRChild>,
    frame: TreeCompileFrame,
    useProvidedOccurrence = false,
    generatedScopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.initial.compositeDepth ?? 0,
  ): void {
    const generated =
      generatedScopeOccurrence !== undefined ||
      (useProvidedOccurrence ? (this.options.initial.generated ?? false) : false);
    for (const [i, child] of children.entries()) {
      const semanticOwner =
        frame.semanticOwner === undefined
          ? undefined
          : this.context.execution.provenanceTracker?.createOwner(
              child,
              i,
              frame.semanticOwner,
              generated,
              this.context.execution.namespaceStack.identity,
            );
      const entityPath = createCompileChildPath(frame.locatorPrefix, i);
      const occurrence = generatedScopeOccurrence
        ? {
            sourcePath: generatedScopeOccurrence.sourcePath,
            expansionPath: [
              ...generatedScopeOccurrence.expansionPath,
              { kind: CompileExpansionKind.ScopeChild, index: i },
            ],
          }
        : useProvidedOccurrence && this.options.initial.occurrence !== undefined && children.length === 1
          ? this.options.initial.occurrence
          : {
              sourcePath: entityPath,
              expansionPath: [],
            };
      const runtimeInputs =
        useProvidedOccurrence && this.options.initial.occurrence !== undefined && children.length === 1
          ? this.options.initial.compositeInputs
          : frame.runtimeInputs === undefined
            ? undefined
            : selectCompositeInputScope(frame.runtimeInputs, ['children', i]);
      this.compileChild(child, i, { ...frame, runtimeInputs }, occurrence, compositeDepth, generated, semanticOwner);
    }
  }
}
