import type { CompileOccurrenceLocator, ScenePrimitive } from '../../contract';
import { CompileExpansionKind, naturalLayoutProposal, selectCompositeInputScope } from '../../contract';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
} from '../../resolve/diagnostics';
import type { IRChild } from '../../schemas';
import type { CompileOwnerKey } from '../provenance';
import type { CompileRuntime } from '../runtime';
import { collectLayoutBounds } from '../scene';
import {
  createCompileChildPath,
  createCompileInvariantError,
  enrichLayoutProbeError,
  orderCompileArtifacts,
} from '../shared';
import { CompositeCompiler } from './composite';
import { visitCoordinate } from './coordinate';
import { visitNode } from './node';
import { queuePathChild, flushPendingPathEmissions } from './path';
import type { SubtreeCompileRuntime, SubtreeCompileState } from './runtime';
import { visitScope } from './scope';
import { resolveStructuralAlignmentGuides, PATH_PLACEHOLDER, stableSortByZIndex } from './shared';
import type { InternalScenePrimitive, TreeOutputState } from './shared';
import type { SubtreeCompileHost, SubtreeCompileOptions, SubtreeCompilation, SubtreeOutputContribution } from './types';

/** 编译任意子树，调度各元素处理并汇总结果 */
export class SubtreeCompiler {
  /** 当前执行的输出记录 */
  private readonly output: TreeOutputState = { zIndexOf: new WeakMap(), pendingPathCount: 0 };

  /** 首次遇到复合组件时创建，同次子树执行复用 */
  private compositeCompiler: CompositeCompiler | undefined;

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly runtime: CompileRuntime,
    private readonly options: SubtreeCompileOptions & SubtreeCompileHost,
  ) {}

  /** 编译当前子树并完成延迟输出与边界收集 */
  run(): SubtreeCompilation {
    const state: SubtreeCompileState = {
      primitives: [],
      layouts: [],
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
          style: { defaults: this.options.scopeDefaults ?? {}, theme: this.runtime.context.theme },
        },
        state,
      },
      true,
    );

    flushPendingPathEmissions(this.runtime, this.output, state.paths);

    let layoutBounds: SubtreeCompilation['layoutBounds'];
    for (const contribution of state.bounds) {
      layoutBounds = collectLayoutBounds(layoutBounds, contribution.boundsPoints, contribution.shadow);
    }

    if (this.output.pendingPathCount !== 0) {
      const detail = __DEV__ ? ` at ${this.collectPlaceholderLocators(state.primitives).join(', ')}` : '';
      throw createCompileInvariantError(
        `internal: ${this.output.pendingPathCount} unresolved path placeholder(s) leaked into Scene output${detail}`,
      );
    }

    // 延迟路径已回填，输出容器中不再包含占位项
    const primitives = stableSortByZIndex(state.primitives as Array<ScenePrimitive>, this.output.zIndexOf);

    const alignmentGuides = resolveStructuralAlignmentGuides(state.alignmentGuides);

    return {
      primitives,
      primitiveZIndices: primitives.map(primitive => this.output.zIndexOf.get(primitive)),
      ...(this.compositeCompiler?.rootContribution === undefined
        ? {}
        : { contribution: this.compositeCompiler.rootContribution }),
      layoutBounds,
      layouts: state.layouts,
      bounds: state.bounds,
      allocations: state.allocations.filter(allocation => allocation.skipAllocation !== true),
      artifacts: orderCompileArtifacts(state.artifacts),
      ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
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
      this.compileChild(
        child,
        index,
        { context: { ...runtime.context, compositeInput: runtimeInputs }, state: runtime.state },
        occurrence,
        compositeDepth,
        generated,
        semanticOwner,
      );
    }
  }

  private compileChild(
    child: IRChild,
    index: number,
    frame: SubtreeCompileRuntime,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ): void {
    try {
      this.runtime.state.execution.withWarningOccurrence(occurrence, () => {
        if ('namespace' in child) {
          this.getCompositeCompiler().compile(child, index, frame, occurrence, compositeDepth, semanticOwner);
          return;
        }

        switch (child.type) {
          case 'node':
            visitNode(this.runtime, this.output, child, index, frame, occurrence, semanticOwner);
            break;
          case 'coordinate':
            visitCoordinate(this.runtime, child, index, frame);
            break;
          case 'scope':
            visitScope(
              this.runtime,
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
            queuePathChild(this.runtime, this.output, child, index, frame, occurrence, semanticOwner);
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
    runtime.state.layouts.push(...contribution.layouts);
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
            this.runtime,
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
