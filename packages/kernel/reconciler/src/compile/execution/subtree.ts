import type { CompileOccurrenceLocator, IRChild, ScenePrimitive } from '@retikz/core';
import {
  CompileExpansionKind,
  mergeLayoutBounds,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  naturalLayoutProposal,
  safeErrorMessage,
  selectCompositeInputScope,
} from '@retikz/core';
import { isPropertyPathEqual } from '@retikz/foundation';

import type { CompileOwnerKey } from '../provenance';
import type { CompileReferenceRead } from '../runtime';
import { createExecutionInvariantError } from '../runtime';
import type { CompileRuntime } from '../runtime';
import {
  createCompileChildPath,
  enrichLayoutProbeError,
  orderCompileArtifacts,
  compileWarningOccurrenceOf,
} from '../shared';
import { CompositeCompiler } from './composite/compile';
import { collectContributionResources, materializeCompileContribution } from './contribution';
import type { CompileContribution } from './contribution';
import { visitCoordinate } from './coordinate/visit';
import { visitNode } from './node/visit';
import { queuePathChild, flushPendingPathEmissions } from './path/deferred';
import type { SubtreeCompileRuntime, SubtreeCompileState } from './runtime';
import { visitScope } from './scope/visit';
import { resolveStructuralAlignmentGuides } from './shared';
import { PATH_PLACEHOLDER } from './shared/constants';
import { stableSortByZIndex } from './shared/output';
import type { InternalScenePrimitive, TreeOutputState } from './shared/output';
import type {
  CompileChildTask,
  SubtreeCompileHost,
  SubtreeCompileOptions,
  SubtreeCompilation,
  SubtreeOutputContribution,
} from './types';

/** 编译任意子树，调度各元素处理并汇总结果 */
export class SubtreeCompiler {
  /** 当前执行的输出记录 */
  private readonly output: TreeOutputState = { zIndexOf: new WeakMap(), pendingPathCount: 0 };

  /** 首次遇到复合组件时创建，同次子树执行复用 */
  private compositeCompiler: CompositeCompiler | undefined;
  private readonly finalizers: Array<() => void> = [];

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly runtime: CompileRuntime,
    private readonly options: SubtreeCompileOptions & SubtreeCompileHost,
  ) {}

  /** 编译当前子树并完成延迟输出与边界收集 */
  run(): SubtreeCompilation {
    const state: SubtreeCompileState = {
      primitives: [],
      geometries: [],
      paths: [],
      publications: [],
      bounds: [],
      allocations: [],
      alignmentGuides: [],
      artifacts: [],
    };

    this.compileChildren(
      this.rootChildren,
      {
        context: {
          layout: { childProposal: this.options.proposal ?? naturalLayoutProposal },
          compositeInput: this.runtime.context.compositeInputs,
          transformChains: this.options.transformChains ?? [],
          pathPrefix: [],
          ...(this.runtime.state.execution.provenanceTracker === undefined
            ? {}
            : { compileOwner: this.runtime.state.execution.provenanceTracker.root }),
          inheritance: { defaults: this.options.scopeDefaults ?? {}, theme: this.runtime.context.theme },
        },
        state,
      },
      true,
    );

    flushPendingPathEmissions(this.runtime, this.output, state.paths);
    for (const finalize of this.finalizers) finalize();

    let visualBounds: SubtreeCompilation['visualBounds'];
    for (const contribution of state.bounds) {
      visualBounds = mergeLayoutBounds(visualBounds, contribution.boundsPoints, contribution.shadow);
    }

    if (this.output.pendingPathCount !== 0) {
      const detail = __DEV__ ? ` at ${this.collectPlaceholderLocators(state.primitives).join(', ')}` : '';
      throw createExecutionInvariantError(
        `internal: ${this.output.pendingPathCount} unresolved path placeholder(s) leaked into Scene output${detail}`,
      );
    }

    // 延迟路径已回填，输出容器中不再包含占位项
    const primitives = stableSortByZIndex(state.primitives as Array<ScenePrimitive>, this.output.zIndexOf);

    const alignmentGuides = resolveStructuralAlignmentGuides(state.alignmentGuides);

    return {
      primitives,
      primitiveZIndices: primitives.map(primitive => this.output.zIndexOf.get(primitive)),
      layout: {
        ...(this.compositeCompiler?.rootContribution === undefined
          ? {}
          : { contribution: this.compositeCompiler.rootContribution }),
        allocations: state.allocations.filter(allocation => allocation.skipAllocation !== true),
        ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
      },
      visualBounds,
      geometries: state.geometries,
      bounds: state.bounds,
      artifacts: orderCompileArtifacts(state.artifacts),
    };
  }

  /**
   * 遍历子元素并继承编译环境
   * @param isRoot 是否处于本次子树编译的根层，用于选择初始来源信息和输入绑定，不一定是 Scene 根层
   */
  private compileChildren(
    children: ReadonlyArray<IRChild>,
    runtime: SubtreeCompileRuntime,
    isRoot = false,
    scopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.compositeDepth ?? 0,
  ): void {
    const tasks: Array<CompileChildTask> = [];
    const generated = scopeOccurrence !== undefined || (isRoot ? (this.options.generated ?? false) : false);
    for (const [index, child] of children.entries()) {
      const semanticOwner =
        runtime.context.compileOwner === undefined
          ? undefined
          : this.runtime.state.execution.provenanceTracker?.createOwner(
              child,
              index,
              runtime.context.compileOwner,
              generated,
              this.runtime.state.execution.namespaceStack.identity,
            );
      const occurrence = scopeOccurrence
        ? {
            sourcePath: scopeOccurrence.sourcePath,
            expansionPath: [...scopeOccurrence.expansionPath, { kind: CompileExpansionKind.ScopeChild, index }],
          }
        : isRoot && this.options.occurrence !== undefined && children.length === 1
          ? this.options.occurrence
          : {
              sourcePath: createCompileChildPath(runtime.context.pathPrefix, index),
              expansionPath: [],
            };
      const runtimeInputs =
        isRoot && this.options.occurrence !== undefined && children.length === 1
          ? this.runtime.context.compositeInputs
          : runtime.context.compositeInput === undefined
            ? undefined
            : selectCompositeInputScope(runtime.context.compositeInput, ['children', index]);
      const producer = generated
        ? this.runtime.state.execution.namespaceStack.currentProducer
        : this.runtime.producer?.(createCompileChildPath(runtime.context.pathPrefix, index));
      const execute = (contribution?: CompileContribution) =>
        this.runtime.state.execution.namespaceStack.withProducer(producer, () =>
          this.compileChild(
            child,
            index,
            { context: { ...runtime.context, compositeInput: runtimeInputs }, state: runtime.state },
            occurrence,
            compositeDepth,
            generated,
            semanticOwner,
            contribution,
          ),
        );
      if (generated || this.options.scheduleChildren === undefined) execute();
      else
        tasks.push({
          deferred: !('namespace' in child) && child.type === 'path',
          path: createCompileChildPath(runtime.context.pathPrefix, index),
          compute: execute,
          publish: execute,
        });
    }
    if (tasks.length > 0) this.options.scheduleChildren!(tasks);
  }

  private compileChild(
    child: IRChild,
    index: number,
    frame: SubtreeCompileRuntime,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
    retained?: CompileContribution,
  ): void {
    try {
      this.runtime.state.execution.withWarningOccurrence(occurrence, () => {
        {
          const contributions =
            generated || (!('namespace' in child) && child.type === 'scope') ? undefined : this.runtime.contributions;
          if (contributions === undefined) {
            this.compileElement(child, index, frame, occurrence, compositeDepth, generated, semanticOwner);
            return;
          }
          const path = createCompileChildPath(frame.context.pathPrefix, index);
          let state: SubtreeCompileState;
          if (retained !== undefined) {
            state = materializeCompileContribution(this.runtime, this.output, retained, semanticOwner);
          } else {
            state = {
              primitives: [],
              geometries: [],
              paths: [],
              publications: [],
              bounds: [],
              allocations: [],
              alignmentGuides: [],
              artifacts: [],
            };
            const reads: Array<CompileReferenceRead> = [];
            const observeRead = (
              name: string,
              entry: CompileReferenceRead['entry'],
              kind: CompileReferenceRead['kind'],
            ) => reads.push({ name, entry, kind });
            const namespace = this.runtime.state.execution.namespaceStack;
            const baseline = namespace.fork();
            namespace.observeReferences(observeRead, () =>
              this.compileElement(
                child,
                index,
                { context: frame.context, state },
                occurrence,
                compositeDepth,
                generated,
                semanticOwner,
              ),
            );
            const bindings = namespace.diffTopFrame(baseline);
            for (const pendingPath of state.paths) pendingPath.observeRead = observeRead;
            const captured = state;
            this.finalizers.push(() => {
              const primitives = captured.primitives as Array<ScenePrimitive>;
              const workspace = this.runtime.state.workspace;
              contributions.write(path, {
                output: {
                  primitives,
                  geometries: captured.geometries,
                  publications: captured.publications,
                  bounds: captured.bounds,
                  allocations: captured.allocations,
                  alignmentGuides: captured.alignmentGuides,
                  artifacts: captured.artifacts,
                },
                zIndices: primitives.map(primitive => this.output.zIndexOf.get(primitive)),
                bindings,
                reads,
                resources: collectContributionResources(primitives, [
                  ...workspace.paintRegistry.getResources(),
                  ...workspace.clipRegistry.getResources(),
                ]),
                diagnostics: workspace.diagnosticCollector.warnings.filter(warning =>
                  isPropertyPathEqual(compileWarningOccurrenceOf(warning).sourcePath, occurrence.sourcePath),
                ),
                provenance:
                  semanticOwner === undefined
                    ? undefined
                    : this.runtime.state.execution.provenanceTracker?.captureContribution(primitives, semanticOwner),
              });
            });
          }
          for (const pendingPath of state.paths) {
            pendingPath.mirror = { primitives: state.primitives, bounds: state.bounds, allocations: state.allocations };
            pendingPath.placeholderSlot.primitives = frame.state.primitives;
            pendingPath.bounds = frame.state.bounds;
            pendingPath.allocations = frame.state.allocations;
          }
          frame.state.primitives.push(...state.primitives);
          frame.state.paths.push(...state.paths);
          frame.state.geometries.push(...state.geometries);
          frame.state.publications.push(...state.publications);
          frame.state.bounds.push(...state.bounds);
          frame.state.allocations.push(...state.allocations);
          frame.state.alignmentGuides.push(...state.alignmentGuides);
          frame.state.artifacts.push(...state.artifacts);
          return;
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

  private compileElement(
    child: IRChild,
    index: number,
    frame: SubtreeCompileRuntime,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ): void {
    if ('namespace' in child) {
      this.getCompositeCompiler().compile(child, index, frame, occurrence, compositeDepth, semanticOwner);
      return;
    }
    const elementRuntime = generated ? { ...this.runtime, stages: undefined } : this.runtime;
    switch (child.type) {
      case 'node':
        visitNode(elementRuntime, this.output, child, index, frame, occurrence, semanticOwner);
        break;
      case 'coordinate':
        visitCoordinate(elementRuntime, child, index, frame);
        break;
      case 'scope':
        visitScope(
          elementRuntime,
          this.output,
          {
            compileChildren: this.compileChildren.bind(this),
            scheduleScope: generated ? undefined : this.options.scheduleScope,
          },
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
        queuePathChild(elementRuntime, this.output, child, index, frame, occurrence, semanticOwner);
    }
  }

  /** 开发诊断：递归找出残留占位的 index 路径 */
  private collectPlaceholderLocators(
    prims: ReadonlyArray<InternalScenePrimitive>,
    prefix = 'primitives',
  ): Array<string> {
    const locators: Array<string> = [];
    prims.forEach((prim, idx) => {
      if (prim.type === PATH_PLACEHOLDER) {
        locators.push(`${prefix}[${idx}]`);
      } else if (prim.type === 'group') {
        locators.push(...this.collectPlaceholderLocators(prim.children, `${prefix}[${idx}].children`));
      }
    });

    return locators;
  }

  /** 将已提交的子树输出合入当前收集状态 */
  private acceptContribution(runtime: SubtreeCompileRuntime, contribution: SubtreeOutputContribution): void {
    for (const [index, primitive] of contribution.primitives.entries()) {
      runtime.state.primitives.push(primitive);
      const zIndex = contribution.primitiveZIndices[index];
      if (zIndex !== undefined) this.output.zIndexOf.set(primitive, zIndex);
    }
    runtime.state.geometries.push(...contribution.geometries);
    runtime.state.publications.push(...contribution.publications);
    runtime.state.bounds.push(...contribution.bounds);
    for (const allocation of contribution.allocations) {
      runtime.state.allocations.push({
        boundsPoints: allocation.boundsPoints,
        skipAllocation: runtime.context.layout?.skipAllocation,
      });
    }
    runtime.state.artifacts.push(...contribution.artifacts);
  }

  /** 按需建立复合组件执行器及其宿主回调 */
  private getCompositeCompiler(): CompositeCompiler {
    return (this.compositeCompiler ??= new CompositeCompiler(
      this.runtime,
      {
        compileSubtree: this.options.compileSubtree,
        acceptContribution: this.acceptContribution.bind(this),
        compileChild: (...args) => this.compileChild(...args),
        compileScopeChild: (...args) =>
          visitScope(
            { ...this.runtime, stages: undefined },
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
}
