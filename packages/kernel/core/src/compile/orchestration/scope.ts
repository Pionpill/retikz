import { formatPropertyPath } from '@retikz/foundation';
import { boundsToRect } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  GroupPrimitive,
  SceneClipPath,
  ScenePrimitive,
  Transform,
} from '../../contract';
import { CompileExpansionKind, naturalLayoutProposal } from '../../contract';
import { selectCompositeInputScope } from '../../contract/composite';
import { resolveNodeBoundary, resolveScopeDefaults, resolveTheme } from '../../resolve';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
} from '../../resolve/diagnostics';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type { IRChild } from '../../schemas';
import { filterAnimations } from '../animation';
import { createCompileChildPath, formatCompileOccurrence, orderCompileArtifacts } from '../artifact';
import { resolveCoordinatePosition } from '../coordinate';
import type { CompiledNodeLayout } from '../node';
import {
  alignmentGuidesOfNode,
  compileNodeState,
  createScopePlaceholderLayout,
  createSyntheticRectangleLayout,
  emitNodeOutput,
} from '../node';
import { compilePathState } from '../path';
import { createCompileInvariantError, enrichLayoutProbeError } from '../probe-failure';
import type { CompileOwnerKey } from '../provenance';
import {
  createPathTargetResolver,
  createPositionResolveContext,
  projectPublishedCompileLayout,
  projectScopeCompileLayouts,
} from '../reference';
import { collectLayoutBounds, optionalVisualBoundsOfPrimitives } from '../scene';
import { compileScopeGeometry, createScopeGroup, prepareScopeGeometry } from '../scope';
import { cloneAlignmentGuides, resolveStructuralAlignmentGuides, transformAlignmentGuides } from './alignment-guide';
import { effectiveAllocations, pushAllocation } from './allocation';
import { CompositeCompiler } from './composite';
import { allocationPointsOf } from './composite/layout';
import type { InternalScenePrimitive, PrimitiveZIndexTable } from './primitive';
import {
  collectPlaceholderLocators,
  createPathPlaceholder,
  recordPrimitiveZIndex,
  stableSortByZIndex,
} from './primitive';
import type {
  CompileExecutionContext,
  ScopeCompileHost,
  CoordinateChild,
  EmitScopeGroupContext,
  NodeChild,
  PathChild,
  PendingPathEmission,
  ScopeChild,
  ScopeCompileFrame,
  ScopeCompilerOptions,
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  ScopeOutputContribution,
  SubtreeCompilation,
} from './types';

/** 调度一个子树执行，继承状态由递归帧持有，隔离与会话生命周期由宿主负责 */
export class ScopeCompiler {
  /** 首次遇到复合组件时创建，同次子树执行复用 */
  private compositeCompiler: CompositeCompiler | undefined;
  /** 当前子树的图元排序旁路表 */
  private readonly zIndexOf: PrimitiveZIndexTable = new WeakMap();
  /** 当前子树尚未回填的路径占位数量 */
  private placeholderBalance = 0;

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly context: CompileExecutionContext,
    private readonly host: ScopeCompileHost,
    private readonly options: ScopeCompilerOptions,
  ) {}

  /** 按需建立复合组件执行器及其宿主回调 */
  private getCompositeCompiler(): CompositeCompiler {
    return (this.compositeCompiler ??= new CompositeCompiler(
      this.context,
      {
        compileSubtree: this.host.compileSubtree,
        acceptContribution: (frame, contribution) => this.acceptContribution(frame, contribution),
        compileChild: (...args) => this.compileChild(...args),
        compileScopeChild: (...args) => this.compileScopeChild(...args),
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
    const rootPrimitives: Array<InternalScenePrimitive> = [];
    const rootPendingPaths: Array<PendingPathEmission> = [];
    const rootBounds: ScopeCompileFrame['boundsSink'] = [];
    const rootAllocations: ScopeCompileFrame['allocationSink'] = [];
    const rootLayouts: ScopeCompileFrame['layoutSink'] = [];
    const rootArtifacts: ScopeCompileFrame['artifactSink'] = [];
    const rootAlignmentGuides: ScopeCompileFrame['alignmentGuideSink'] = [];

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
        ...(this.context.provenanceTracker === undefined ? {} : { semanticOwner: this.context.provenanceTracker.root }),
      },
      true,
    );

    this.flushPendingPathEmissions(rootPendingPaths);

    let layoutBounds: SubtreeCompilation['layoutBounds'];
    for (const contribution of rootBounds) {
      layoutBounds = collectLayoutBounds(layoutBounds, contribution.boundsPoints, contribution.shadow);
    }

    if (this.placeholderBalance !== 0) {
      const detail = __DEV__ ? ` at ${collectPlaceholderLocators(rootPrimitives).join(', ')}` : '';
      throw createCompileInvariantError(
        `internal: ${this.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
      );
    }

    // 延迟路径已回填，输出容器中不再包含占位项
    const primitives = stableSortByZIndex(rootPrimitives as Array<ScenePrimitive>, this.zIndexOf);

    const alignmentGuides = resolveStructuralAlignmentGuides(rootAlignmentGuides);

    this.context.workspace.paintRegistry.validateReferences(this.context.workspace.clipRegistry.resources());

    return {
      primitives,
      primitiveZIndices: primitives.map(primitive => this.zIndexOf.get(primitive)),
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

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
  private compileScopeChild(
    child: ScopeChild,
    index: number,
    frame: ScopeCompileFrame,
    generatedOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.initial.compositeDepth ?? 0,
    semanticOwner?: CompileOwnerKey,
    compileNested?: (
      scopeFrame: ScopeCompileFrame,
      preliminaryTransforms: ReadonlyArray<Transform> | undefined,
    ) => void,
    preResolvedClipPath?: SceneClipPath,
  ): void {
    const { locatorPrefix, scopeDefaults } = frame;

    const themePath =
      generatedOccurrence === undefined
        ? formatPropertyPath([...createCompileChildPath(locatorPrefix, index), 'theme'])
        : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
    const theme = resolveTheme(frame.theme, child.theme, themePath, this.context.shared.registries.themeRegistry);
    const scopeGeometryContext = {
      positionContext: this.positionContextOf(frame.scopeChain),
      irPath: createCompileChildPath(locatorPrefix, index),
      onWarn: this.context.workspace.diagnostics.collect,
    };
    const preparation = prepareScopeGeometry(child, scopeGeometryContext);

    // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
    // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
    const { preliminaryTransforms } = preparation;
    const preliminaryScopeChain =
      preliminaryTransforms === undefined
        ? frame.scopeChain
        : this.context.scopeTransformComposer.append(frame.scopeChain, preliminaryTransforms);
    const layoutPlaceholder = this.registerScopeLayoutPlaceholder(child, { index, frame });
    if (layoutPlaceholder.placeholderLayout !== undefined) {
      this.context.namespaceStack.enterScope(layoutPlaceholder.placeholderLayout, child.id!);
    }

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) {
      this.context.namespaceStack.pushFrame();
    }

    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<CompiledNodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    const scopePublications: Array<CompiledNodeLayout> = [];
    const scopeBounds: ScopeCompileFrame['boundsSink'] = [];
    const scopeAllocations: ScopeCompileFrame['allocationSink'] = [];
    const scopeAlignmentGuides: ScopeCompileFrame['alignmentGuideSink'] = [];
    const scopeArtifacts: ScopeCompileFrame['artifactSink'] = [];
    let scopeTransforms: Array<Transform> = [];

    try {
      const scopeFrame: ScopeCompileFrame = {
        runtimeInputs: frame.runtimeInputs,
        childProposal: frame.childProposal,
        scopeChain: preliminaryScopeChain,
        primitiveSink: scopePrimitiveSink,
        locatorPrefix: createCompileChildPath(locatorPrefix, index),
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        scopeDefaults: resolveScopeDefaults(child, scopeDefaults),
        theme,
        publicationSink: scopePublications,
        boundsSink: scopeBounds,
        allocationSink: scopeAllocations,
        alignmentGuideSink: scopeAlignmentGuides,
        ...(frame.allocationBoundary === undefined ? {} : { allocationBoundary: frame.allocationBoundary }),
        artifactSink: scopeArtifacts,
        ...(semanticOwner === undefined ? {} : { semanticOwner }),
      };
      if (compileNested === undefined) {
        this.compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
      } else {
        compileNested(scopeFrame, preliminaryTransforms);
      }

      const geometry = compileScopeGeometry(
        child,
        preparation,
        scopeLayouts,
        this.context.shared,
        scopeGeometryContext,
      );
      const intrinsicLayout = geometry.envelope;
      scopeTransforms = geometry.transforms;

      const postTransforms =
        preliminaryTransforms === undefined
          ? scopeTransforms
          : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

      for (const layout of scopePublications) {
        const projected = projectPublishedCompileLayout(layout, frame.scopeChain, postTransforms);
        this.context.namespaceStack.replacePublishedLayout(layout, projected);
        frame.publicationSink.push(projected);
      }

      frame.artifactSink.push(...scopeArtifacts);

      for (const pendingPath of scopePendingPaths) {
        pendingPath.scopeChain = this.context.scopeTransformComposer.insert(
          pendingPath.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
      }

      const finalEnvelope =
        scopeTransforms.length === 0
          ? intrinsicLayout
          : this.context.scopeTransformComposer.project(intrinsicLayout, scopeTransforms);
      frame.layoutSink.push(...projectScopeCompileLayouts(child, intrinsicLayout, scopeLayouts, scopeTransforms));
      if (child.id !== undefined) {
        const globalEnvelope = this.context.scopeTransformComposer.project(finalEnvelope, frame.scopeChain);
        this.context.namespaceStack.replaceLayout(
          child.id,
          globalEnvelope,
          layoutPlaceholder.parentFrameDepth,
          layoutPlaceholder.placeholderLayout,
        );
        frame.publicationSink.push(globalEnvelope);
      }

      this.flushPendingPathEmissions(scopePendingPaths);
      this.options.captureScopeTargets?.(
        child,
        this.context.namespaceStack,
        this.context.scopeTransformComposer.append(frame.scopeChain, scopeTransforms),
      );

      for (const contribution of effectiveAllocations(scopeAllocations)) {
        pushAllocation(
          frame.allocationSink,
          contribution.boundsPoints.map(point => this.context.scopeTransformComposer.apply(point, scopeTransforms)),
          frame.allocationBoundary,
        );
      }

      const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
      const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
      if (transformedGuides !== undefined) frame.alignmentGuideSink.push(...transformedGuides);
    } finally {
      if (layoutPlaceholder.placeholderLayout !== undefined) this.context.namespaceStack.leaveScope();
      if (didPushNamespaceFrame) {
        this.context.namespaceStack.popFrame();
      }
    }

    const clipRef = this.emitScopeGroup(child, {
      index,
      scopeTransforms,
      scopePrimitiveSink,
      frame,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      ...(preResolvedClipPath === undefined ? {} : { resolvedClipPath: preResolvedClipPath }),
    });

    for (const contribution of scopeBounds) {
      if (contribution.decoration === true) {
        const bounds = collectLayoutBounds(undefined, contribution.boundsPoints);
        if (bounds === undefined) continue;

        const rectangle = boundsToRect(bounds);
        const projected = optionalVisualBoundsOfPrimitives(
          [
            {
              type: 'group',
              transforms: scopeTransforms,
              ...(clipRef === undefined ? {} : { clipRef }),
              children: [{ type: 'rect', ...rectangle, fill: 'black' }],
            },
          ],
          this.context.workspace.clipRegistry.resources(),
        );
        if (projected !== undefined)
          frame.boundsSink.push({ boundsPoints: allocationPointsOf(projected), decoration: true });
      } else {
        frame.boundsSink.push({
          boundsPoints: contribution.boundsPoints.map(point =>
            this.context.scopeTransformComposer.apply(point, scopeTransforms),
          ),
          shadow: contribution.shadow,
        });
      }
    }
  }

  private compileChild(
    child: IRChild,
    index: number,
    frame: ScopeCompileFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ): void {
    try {
      this.context.withWarningOccurrence(occurrence, () => {
        if ('namespace' in child) {
          this.getCompositeCompiler().compile(child, index, frame, occurrence, compositeDepth, semanticOwner);
          return;
        }

        switch (child.type) {
          case 'node':
            this.emitNodeChild(child, index, frame, occurrence, semanticOwner);
            break;
          case 'coordinate':
            this.registerCoordinateChild(child, index, frame);
            break;
          case 'scope':
            this.compileScopeChild(
              child,
              index,
              frame,
              generated ? occurrence : undefined,
              compositeDepth,
              semanticOwner,
            );
            break;
          default:
            this.queuePathChild(child, index, frame, occurrence, semanticOwner);
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

  /** 接受已重映射的子树输出，统一维护当前帧的收集容器 */
  private acceptContribution(frame: ScopeCompileFrame, contribution: ScopeOutputContribution): void {
    for (const [index, primitive] of contribution.primitives.entries()) {
      frame.primitiveSink.push(primitive);
      recordPrimitiveZIndex(this.zIndexOf, primitive, contribution.primitiveZIndices[index]);
    }
    frame.layoutSink.push(...contribution.layouts);
    frame.publicationSink.push(...contribution.publications);
    frame.boundsSink.push(...contribution.bounds);
    for (const allocation of contribution.allocations) {
      pushAllocation(frame.allocationSink, allocation.boundsPoints, frame.allocationBoundary);
    }
    frame.artifactSink.push(...contribution.artifacts);
  }

  /** 从当前执行状态投影 resolver 所需的窄位置上下文 */
  private positionContextOf(scopeChain: ReadonlyArray<Transform>): PositionTargetResolveContext {
    return createPositionResolveContext({
      nodeBoundaryContext: this.context.workspace.nodeBoundaryContext,
      lookupReference: id => this.context.namespaceStack.lookupReference(id),
      nodeDistance: this.context.shared.layout.nodeDistance,
      scopeChain,
      resolveExplicitBoundary: (boundary, referenceContext) =>
        resolveNodeBoundary(boundary, {
          visualDef: referenceContext.visualDef,
          visualParams: referenceContext.visualParams,
          shapeRegistry: this.context.shared.registries.shapeRegistry,
          boundaryRegistry: this.context.shared.registries.boundaryRegistry,
          irPath: referenceContext.irPath,
        }),
      composedTransform: this.context.scopeTransformComposer.resolve(scopeChain),
    });
  }

  /** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
  private flushPendingPathEmissions(pendingPaths: ReadonlyArray<PendingPathEmission>): void {
    if (pendingPaths.length === 0) return;

    this.context.namespaceStack.enterResolvingPhase();

    try {
      for (const pendingPath of pendingPaths) {
        const targetResolver = createPathTargetResolver(chain => this.positionContextOf(chain));
        const { result, resolution } = this.context.withWarningOccurrence(pendingPath.occurrence, () =>
          compilePathState(pendingPath, targetResolver, {
            ...this.context,
            resolveTransform: this.context.scopeTransformComposer.resolve,
          }),
        );
        const rawPrimitives = result?.primitives ?? [];
        const primitives = this.context.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
        const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
        if (idx === -1) {
          throw createCompileInvariantError('internal: path placeholder missing from its sink');
        }

        pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
        if (pendingPath.semanticOwner !== undefined) {
          this.context.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
        }

        this.placeholderBalance--;

        for (const prim of primitives) recordPrimitiveZIndex(this.zIndexOf, prim, pendingPath.zIndex);
        if (result !== null) {
          pendingPath.boundsSink.push({
            boundsPoints: [...result.boundsPoints],
            shadow: resolution.path.shadow,
          });
          pushAllocation(pendingPath.allocationSink, [...result.boundsPoints], pendingPath.allocationBoundary);
        }
      }
    } finally {
      this.context.namespaceStack.exitResolvingPhase();
    }
  }

  /** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
  private emitNodeChild(
    child: NodeChild,
    index: number,
    frame: ScopeCompileFrame,
    occurrence?: CompileOccurrenceLocator,
    semanticOwner?: CompileOwnerKey,
  ): void {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, scopeDefaults } = frame;
    const nodeIrPath = createCompileChildPath(locatorPrefix, index);

    const compilation = compileNodeState(child, nodeIrPath, {
      ...this.context,
      scopeDefaults,
      mode: frame.theme.mode,
      scopeChain,
      positionContext: this.positionContextOf(scopeChain),
      composedTransform: this.context.scopeTransformComposer.resolve(scopeChain),
      childProposal: frame.childProposal,
    });

    const { layout } = compilation;
    const globalLayout = this.context.scopeTransformComposer.project(layout, scopeChain);
    if (child.id) {
      this.context.namespaceStack.register(child.id, globalLayout, [...nodeIrPath, 'id']);
      child.aliasIds?.forEach((id, aliasIndex) =>
        this.context.namespaceStack.register(id, globalLayout, [...nodeIrPath, 'aliasIds', aliasIndex]),
      );
    }

    frame.publicationSink.push(globalLayout);
    const output = emitNodeOutput(compilation, this.context.shared, this.context.workspace);
    const emittedPrimitives =
      this.context.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
    if (semanticOwner !== undefined) {
      this.context.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
    }

    for (const prim of emittedPrimitives) {
      primitiveSink.push(prim);
      recordPrimitiveZIndex(this.zIndexOf, prim, child.zIndex);
    }

    frame.boundsSink.push(...output.bounds);
    pushAllocation(frame.allocationSink, output.bounds[0].boundsPoints, frame.allocationBoundary);
    const alignmentGuides = alignmentGuidesOfNode(layout, this.context.shared.layout.round);
    if (alignmentGuides !== undefined) {
      frame.alignmentGuideSink.push(
        ...cloneAlignmentGuides(alignmentGuides, `Node '${formatPropertyPath(nodeIrPath)}'`),
      );
    }

    layoutSink.push(layout);
  }

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
  private registerCoordinateChild(child: CoordinateChild, index: number, frame: ScopeCompileFrame): void {
    const { scopeChain, locatorPrefix, layoutSink } = frame;
    const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
    const localCenter = resolveCoordinatePosition(child, this.positionContextOf(scopeChain));

    const globalCenter =
      scopeChain.length === 0 ? localCenter : this.context.scopeTransformComposer.apply(localCenter, scopeChain);
    const localCoordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: localCenter[0], y: localCenter[1], width: 0, height: 0, rotate: 0 } },
      {
        shapes: this.context.shared.registries.shapeRegistry,
        boundaries: this.context.shared.registries.boundaryRegistry,
      },
    );
    const coordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
      {
        shapes: this.context.shared.registries.shapeRegistry,
        boundaries: this.context.shared.registries.boundaryRegistry,
      },
    );
    this.context.namespaceStack.register(child.id, coordinateLayout, [...coordinateIrPath, 'id']);
    frame.publicationSink.push(coordinateLayout);
    pushAllocation(frame.allocationSink, [localCenter], frame.allocationBoundary);
    layoutSink.push(localCoordinateLayout);
  }

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
  private queuePathChild(
    child: PathChild,
    index: number,
    frame: ScopeCompileFrame,
    occurrence: CompileOccurrenceLocator,
    semanticOwner?: CompileOwnerKey,
  ): void {
    const { scopeChain, primitiveSink, locatorPrefix, pathSink, scopeDefaults } = frame;
    const pathIrPath = createCompileChildPath(locatorPrefix, index);
    const placeholder = createPathPlaceholder();
    primitiveSink.push(placeholder);
    const pending: PendingPathEmission = {
      path: {
        ...child,
        animations: filterAnimations(child.animations, {
          target: 'element',
          onWarn: this.context.workspace.diagnostics.collect,
          irPath: pathIrPath,
        }),
      },
      irPath: pathIrPath,
      scopeChain,
      boundsSink: frame.boundsSink,
      allocationSink: frame.allocationSink,
      ...(frame.allocationBoundary === undefined ? {} : { allocationBoundary: frame.allocationBoundary }),
      placeholderSlot: { primitiveSink, placeholder },
      occurrence,
      theme: frame.theme,
      scopeDefaults,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      zIndex: child.zIndex,
    };
    this.placeholderBalance++;
    pathSink.push(pending);
  }

  /** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
  private registerScopeLayoutPlaceholder(
    child: ScopeChild,
    input: ScopeLayoutPlaceholderContext,
  ): ScopeLayoutPlaceholder {
    const { index, frame } = input;
    const { locatorPrefix } = frame;
    const scopeIrPath = createCompileChildPath(locatorPrefix, index);
    const parentFrameDepth = this.context.namespaceStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = createScopePlaceholderLayout(child.id, frame.scopeChain, {
      shapes: this.context.shared.registries.shapeRegistry,
      boundaries: this.context.shared.registries.boundaryRegistry,
    });
    this.context.namespaceStack.register(child.id, placeholderLayout, [...scopeIrPath, 'id'], 'scope-placeholder');

    return { parentFrameDepth, placeholderLayout };
  }

  /** 在需要可见输出时 emit scope group，并挂载 transform、clip 和动画 */
  private emitScopeGroup(child: ScopeChild, input: EmitScopeGroupContext): string | undefined {
    const { index, scopeTransforms, scopePrimitiveSink, frame, resolvedClipPath, semanticOwner } = input;
    const { primitiveSink, locatorPrefix } = frame;
    const scopeIrPath = createCompileChildPath(locatorPrefix, index);
    const hasScopeTransforms = scopeTransforms.length > 0;
    const isPrunable =
      scopePrimitiveSink.length === 0 && !hasScopeTransforms && child.id === undefined && child.clip === undefined;
    if (isPrunable) return;

    const group: GroupPrimitive = {
      ...createScopeGroup(
        child,
        scopeTransforms,
        this.context.shared,
        this.context.workspace,
        scopeIrPath,
        resolvedClipPath,
      ),
      // 当前 Scope 的延迟路径已在收尾阶段回填
      children: stableSortByZIndex(scopePrimitiveSink as Array<ScenePrimitive>, this.zIndexOf),
    };
    primitiveSink.push(group);
    if (semanticOwner !== undefined) this.context.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
    recordPrimitiveZIndex(this.zIndexOf, group, child.zIndex);

    return group.clipRef;
  }

  private compileChildren(
    children: ReadonlyArray<IRChild>,
    frame: ScopeCompileFrame,
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
          : this.context.provenanceTracker?.createOwner(
              child,
              i,
              frame.semanticOwner,
              generated,
              this.context.namespaceStack.identity,
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
