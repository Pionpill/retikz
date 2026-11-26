import type {
  CompileOccurrenceLocator,
  CompositeInputScope,
  IRChild,
  LayoutContribution,
  ScenePrimitive,
  MergedScopeDefaults,
  Transform,
} from '@retikz/core';
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

import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createExecutionInvariantError } from '../../runtime';
import { createCompileChildPath, enrichLayoutProbeError, orderCompileArtifacts } from '../../shared';
import { compileComposite } from '../composite';
import { visitCoordinate, visitNode, queuePathChild, flushPendingPathEmissions } from '../leaf';
import { visitScope } from '../scope';
import { resolveStructuralAlignmentGuides, PATH_PLACEHOLDER } from '../shared';
import type { InternalScenePrimitive, TreeOutputState } from '../shared';
import type {
  SubtreeCompileRuntime,
  SubtreeCompileState,
  SubtreeCompileHost,
  SubtreeCompileOptions,
  SubtreeCompilation,
  SubtreeOutputContribution,
} from './compile';

/** 缺省根环境无可变成员；跨批共享空值，输出收集容器仍由每次执行独立创建 */
const emptyDefaults: MergedScopeDefaults = Object.freeze({});

/** 未指定祖先变换时共享只读空链，不作为批内输出容器使用 */
const emptyTransforms: ReadonlyArray<Transform> = Object.freeze([]);

/** 共享元素执行与输出工作区；计算顺序由所属驱动选择 */
export class CompileElementExecutor {
  /** 当前执行的输出记录 */
  readonly output: TreeOutputState = { zIndexMap: new WeakMap(), pendingPathCount: 0 };

  /** 当前子树根组件在测量模式下返回的分配贡献 */
  private rootContribution: LayoutContribution | undefined;

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly runtime: CompileRuntime,
    private readonly options: SubtreeCompileOptions & SubtreeCompileHost,
  ) {}

  /** 创建当前执行的根环境与输出收集容器 */
  createRootRuntime(): SubtreeCompileRuntime {
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

    return {
      context: {
        skipGeometries: this.options.skipRootGeometries,
        layout: {
          childProposal: this.options.proposal ?? naturalLayoutProposal,
          // ⚡默认跳过无人消费的父布局占位传播，测量和增量驱动按需显式开启
          skipAllocation: this.options.skipAllocation ?? true,
        },
        compositeInput: this.runtime.context.compositeInputs,
        transformChains: this.options.transformChains ?? emptyTransforms,
        pathPrefix: [],
        ...(this.runtime.state.execution.provenanceTracker === undefined
          ? {}
          : {
              compileOwner: this.runtime.state.execution.provenanceTracker.root,
            }),
        inheritance: { defaults: this.options.scopeDefaults ?? emptyDefaults, theme: this.runtime.context.theme },
      },
      state,
    };
  }

  /** 全量遍历当前根的子项；增量调度独立构建同形状态 */
  compileRootChildren(): SubtreeCompileState {
    const frame = this.createRootRuntime();
    this.compileChildren(this.rootChildren, frame, true);
    return frame.state;
  }

  /** 完成绘制输出；根 Scene 无需父布局测量与重放数据 */
  finishDrawing(state: SubtreeCompileState) {
    flushPendingPathEmissions(this.runtime, this.output, state.paths);

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
    const primitives = (state.primitives as Array<ScenePrimitive>).sort(
      (a, b) => (this.output.zIndexMap.get(a) ?? 0) - (this.output.zIndexMap.get(b) ?? 0),
    );

    return { primitives, visualBounds, artifacts: orderCompileArtifacts(state.artifacts) };
  }

  /** 子树同时交付父布局测量与重放所需的几何和顺序 */
  finish(state: SubtreeCompileState): SubtreeCompilation {
    const drawing = this.finishDrawing(state);
    const alignmentGuides = resolveStructuralAlignmentGuides(state.alignmentGuides);

    return {
      ...drawing,
      primitiveZIndices: drawing.primitives.map(primitive => this.output.zIndexMap.get(primitive)),
      layout: {
        ...(this.rootContribution === undefined ? {} : { contribution: this.rootContribution }),
        allocations: state.allocations.filter(allocation => allocation.skipAllocation !== true),
        ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
      },
      geometries: state.geometries,
      bounds: state.bounds,
    };
  }

  /**
   * 遍历子元素并继承编译环境
   * @param isRoot 是否处于本次子树编译的根层，用于选择初始来源信息和输入绑定，不一定是 Scene 根层
   */
  compileChildren(
    children: ReadonlyArray<IRChild>,
    runtime: SubtreeCompileRuntime,
    isRoot = false,
    scopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.compositeDepth ?? 0,
  ): void {
    for (const [index, child] of children.entries())
      this.compileChild(child, index, runtime, isRoot, scopeOccurrence, compositeDepth);
  }

  /** 准备声明的来源与输入绑定并编译，不生成子节点计算任务 */
  compileChild(
    child: IRChild,
    index: number,
    runtime: SubtreeCompileRuntime,
    isRoot = false,
    scopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.compositeDepth ?? 0,
    authoredInput?: CompositeInputScope,
  ): CompileOwnerKey | undefined {
    const generated = scopeOccurrence !== undefined || (isRoot ? (this.options.generated ?? false) : false);
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
      : isRoot && this.options.occurrence !== undefined && this.rootChildren.length === 1
        ? this.options.occurrence
        : {
            sourcePath: createCompileChildPath(runtime.context.pathPrefix, index),
            expansionPath: [],
          };
    const runtimeInputs =
      authoredInput ??
      (isRoot && this.options.occurrence !== undefined && this.rootChildren.length === 1
        ? this.runtime.context.compositeInputs
        : runtime.context.compositeInput === undefined
          ? undefined
          : selectCompositeInputScope(runtime.context.compositeInput, ['children', index]));
    this.compilePreparedChild(
      child,
      index,
      { context: { ...runtime.context, compositeInput: runtimeInputs }, state: runtime.state },
      occurrence,
      compositeDepth,
      generated,
      semanticOwner,
    );
    return semanticOwner;
  }

  /** 编译已准备来源与输入绑定的子项，并统一包装外部编译失败 */
  private compilePreparedChild(
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
        {
          this.compileElement(child, index, frame, occurrence, compositeDepth, generated, semanticOwner);
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
      const contribution = compileComposite(
        {
          runtime: this.runtime,
          host: {
            compileSubtree: this.options.compileSubtree,
            acceptContribution: this.acceptContribution.bind(this),
            compilePreparedChild: (...args) => this.compilePreparedChild(...args),
            compileScopeChild: (ir, scopeIndex, scopeFrame, options) =>
              visitScope(
                this.runtime,
                this.output,
                { compileChildren: this.compileChildren.bind(this) },
                ir,
                scopeIndex,
                scopeFrame,
                {
                  ...options,
                  captureScopeTargets: options?.captureScopeTargets ?? this.options.captureScopeTargets,
                  compositeDepth: options?.compositeDepth ?? this.options.compositeDepth,
                },
              ),
          },
        },
        child,
        index,
        frame,
        occurrence,
        compositeDepth,
        {
          probe: this.options.probe,
          measurementAxis: child === this.rootChildren[0] ? this.options.measurementAxis : undefined,
          semanticOwner,
        },
      );
      if (contribution !== undefined) this.rootContribution = contribution;
      return;
    }
    const elementRuntime = this.runtime;
    switch (child.type) {
      case 'node':
        visitNode(elementRuntime, this.output, child, index, frame, semanticOwner);
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
          },
          child,
          index,
          frame,
          {
            captureScopeTargets: this.options.captureScopeTargets,
            generatedOccurrence: generated ? occurrence : undefined,
            compositeDepth,
            semanticOwner,
          },
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
      if (zIndex !== undefined) this.output.zIndexMap.set(primitive, zIndex);
    }
    if (!runtime.context.skipGeometries) runtime.state.geometries.push(...contribution.geometries);
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
}
