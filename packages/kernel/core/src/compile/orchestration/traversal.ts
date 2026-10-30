import { formatPropertyPath } from '@retikz/foundation';
import { boundsToRect } from '@retikz/math';

import type { CompileOccurrenceLocator, GroupPrimitive, SceneClipPath, Transform } from '../../contract';
import { CompileExpansionKind, naturalLayoutProposal } from '../../contract';
import { selectCompositeInputScope } from '../../contract/composite';
import type { NodeBoundaryResolver } from '../../resolve';
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
import type { FullCompileContext } from '../context';
import { resolveCoordinatePosition } from '../coordinate';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../diagnostics';
import { NamespaceStack } from '../namespace';
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
import {
  createIntrinsicScopeLayout,
  createScopeGroup,
  resolveFinalScopeTransforms,
  resolvePreliminaryScopeTransforms,
  resolveScopePositionTarget,
} from '../scope';
import { createScopeTransformContext } from '../transform';
import type { InputCompileWarning } from '../warning';
import { cloneAlignmentGuides, resolveStructuralAlignmentGuides, transformAlignmentGuides } from './alignment-guide';
import { effectiveAllocations, pushAllocation } from './allocation';
import { CompositeCompiler } from './composite';
import { allocationPointsOf } from './composite/layout';
import { CompositeCompileSession } from './composite/session';
import type { InternalScenePrimitive } from './primitive';
import {
  collectPlaceholderLocators,
  createPathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';
import type {
  CoordinateChild,
  EmitScopeGroupContext,
  NodeChild,
  PathChild,
  PendingPathEmission,
  ScopeChild,
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  TraversalCompileOptions,
  TraversalFrame,
  TraversalResult,
  TraversalRuntime,
} from './types';

/** 单次子树编译的调度器；隔离试编译使用独立实例 */
export class CompileTraversal {
  private readonly scopeTransformsContext = createScopeTransformContext();

  private readonly warningOccurrences: Array<CompileOccurrenceLocator> = [];

  private readonly runtime: TraversalRuntime;

  private readonly composite: CompositeCompiler;

  private dispatchWarning = (warning: InputCompileWarning): void => {
    this.context.workspace.diagnostics.collect(withCompileWarningOccurrence(warning, this.warningOccurrences.at(-1)));
  };

  resolveExplicitBoundary: NodeBoundaryResolver = (boundary, referenceContext) => {
    return resolveNodeBoundary(boundary, {
      visualDef: referenceContext.visualDef,
      visualParams: referenceContext.visualParams,
      shapeRegistry: this.runtime.context.shared.registries.shapeRegistry,
      boundaryRegistry: this.runtime.context.shared.registries.boundaryRegistry,
      irPath: referenceContext.irPath,
    });
  };

  constructor(
    private readonly rootChildren: ReadonlyArray<IRChild>,
    private readonly context: FullCompileContext,
    private readonly options: TraversalCompileOptions = {},
  ) {
    const session = this.options.session ?? new CompositeCompileSession();
    this.runtime = {
      context: {
        shared: this.context.shared,
        workspace: {
          ...this.context.workspace,
          diagnostics: { ...this.context.workspace.diagnostics, collect: this.dispatchWarning },
        },
        session,
      },
      state: {
        primitives: [],
        layoutBounds: undefined,
        namespaceStack:
          this.options.namespaceStack ??
          new NamespaceStack({
            rootIdentity: this.options.provenanceTracker?.rootNamespace,
            onDuplicate: info => this.dispatchWarning(createDuplicateWarning(info)),
          }),
        zIndexOf: new WeakMap(),
        placeholderBalance: 0,
        ...(this.options.provenanceTracker === undefined ? {} : { provenanceTracker: this.options.provenanceTracker }),
      },
    };
    this.composite = new CompositeCompiler(
      rootChildren,
      options,
      this.runtime,
      this.scopeTransformsContext,
      this,
      compileChildrenToPrimitives,
    );
  }

  /** 编译当前子树并完成延迟输出与边界收集 */
  run(): TraversalResult {
    const rootPendingPaths: Array<PendingPathEmission> = [];

    const rootBounds: TraversalFrame['boundsSink'] = [];

    const rootAllocations: TraversalFrame['allocationSink'] = [];

    const rootLayouts: TraversalFrame['layoutSink'] = [];

    const rootArtifacts: TraversalFrame['artifactSink'] = [];

    const rootAlignmentGuides: TraversalFrame['alignmentGuideSink'] = [];

    this.compileChildren(
      this.rootChildren,
      {
        childProposal: this.options.proposal ?? naturalLayoutProposal,
        runtimeInputs: this.options.runtimeInputs ?? this.context.compositeInputs,
        scopeChain: this.options.scopeChain ?? [],
        primitiveSink: this.runtime.state.primitives,
        locatorPrefix: [],
        layoutSink: rootLayouts,
        pathSink: rootPendingPaths,
        scopeDefaults: this.options.scopeDefaults ?? {},
        theme: this.options.theme ?? this.context.theme,
        publicationSink: [],
        boundsSink: rootBounds,
        allocationSink: rootAllocations,
        alignmentGuideSink: rootAlignmentGuides,
        artifactSink: rootArtifacts,
        ...(this.options.semanticOwner === undefined && this.runtime.state.provenanceTracker === undefined
          ? {}
          : { semanticOwner: this.options.semanticOwner ?? this.runtime.state.provenanceTracker?.root }),
      },
      true,
    );

    this.flushPendingPathEmissions(rootPendingPaths);

    for (const contribution of rootBounds) {
      this.runtime.state.layoutBounds = collectLayoutBounds(
        this.runtime.state.layoutBounds,
        contribution.boundsPoints,
        contribution.shadow,
      );
    }

    if (this.runtime.state.placeholderBalance !== 0) {
      const detail = __DEV__ ? ` at ${collectPlaceholderLocators(this.runtime.state.primitives).join(', ')}` : '';
      throw createCompileInvariantError(
        `internal: ${this.runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
      );
    }

    const primitives = stableSortByZIndex(sealSink(this.runtime.state.primitives), this.runtime.state.zIndexOf);

    const alignmentGuides = resolveStructuralAlignmentGuides(rootAlignmentGuides);

    this.runtime.context.workspace.paintRegistry.validateReferences(
      this.runtime.context.workspace.clipRegistry.resources(),
    );

    return {
      primitives,
      primitiveZIndices: primitives.map(primitive => this.runtime.state.zIndexOf.get(primitive)),
      ...(this.composite.rootContribution === undefined ? {} : { contribution: this.composite.rootContribution }),
      layoutBounds: this.runtime.state.layoutBounds,
      layouts: rootLayouts,
      bounds: rootBounds,
      allocations: effectiveAllocations(rootAllocations),
      artifacts: orderCompileArtifacts(rootArtifacts),
      ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
    };
  }

  /** 在同步 child 编译或延迟 emit 期间绑定当前 warning occurrence */
  withWarningOccurrence<T>(occurrence: CompileOccurrenceLocator, execute: () => T): T {
    this.warningOccurrences.push(occurrence);
    this.options.observeWarningOccurrence?.(occurrence);

    try {
      return execute();
    } finally {
      this.warningOccurrences.pop();
      this.options.observeWarningOccurrence?.(this.warningOccurrences.at(-1));
    }
  }

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
  compileScopeChild(
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
    generatedOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.compositeDepth ?? 0,
    semanticOwner?: CompileOwnerKey,
    compileNested?: (scopeFrame: TraversalFrame, preliminaryTransforms: ReadonlyArray<Transform> | undefined) => void,
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
      onWarn: this.runtime.context.workspace.diagnostics.collect,
    };
    const positionTarget = resolveScopePositionTarget(child, scopeGeometryContext);

    // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
    // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
    const preliminaryTransforms = resolvePreliminaryScopeTransforms(child, scopeGeometryContext);
    const preliminaryScopeChain =
      preliminaryTransforms === undefined
        ? frame.scopeChain
        : this.scopeTransformsContext.append(frame.scopeChain, preliminaryTransforms);
    const layoutPlaceholder = this.registerScopeLayoutPlaceholder(child, { index, frame });
    if (layoutPlaceholder.placeholderLayout !== undefined) {
      this.runtime.state.namespaceStack.enterScope(layoutPlaceholder.placeholderLayout, child.id!);
    }

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) {
      this.runtime.state.namespaceStack.pushFrame();
    }

    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<CompiledNodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    const scopePublications: Array<CompiledNodeLayout> = [];
    const scopeBounds: TraversalFrame['boundsSink'] = [];
    const scopeAllocations: TraversalFrame['allocationSink'] = [];
    const scopeAlignmentGuides: TraversalFrame['alignmentGuideSink'] = [];
    const scopeArtifacts: TraversalFrame['artifactSink'] = [];
    let scopeTransforms: Array<Transform> = [];

    try {
      const scopeFrame: TraversalFrame = {
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

      const intrinsicLayout = createIntrinsicScopeLayout(child, scopeLayouts, this.runtime.context.shared);

      scopeTransforms = resolveFinalScopeTransforms(
        child,
        scopeGeometryContext,
        intrinsicLayout,
        positionTarget,
        preliminaryTransforms,
      );

      const postTransforms =
        preliminaryTransforms === undefined
          ? scopeTransforms
          : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

      for (const layout of scopePublications) {
        const projected = projectPublishedCompileLayout(layout, frame.scopeChain, postTransforms);
        this.runtime.state.namespaceStack.replacePublishedLayout(layout, projected);
        frame.publicationSink.push(projected);
      }

      frame.artifactSink.push(...scopeArtifacts);

      for (const pendingPath of scopePendingPaths) {
        pendingPath.scopeChain = this.scopeTransformsContext.insert(
          pendingPath.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
      }

      const finalEnvelope =
        scopeTransforms.length === 0
          ? intrinsicLayout
          : this.scopeTransformsContext.project(intrinsicLayout, scopeTransforms);
      frame.layoutSink.push(...projectScopeCompileLayouts(child, intrinsicLayout, scopeLayouts, scopeTransforms));
      if (child.id !== undefined) {
        const globalEnvelope = this.scopeTransformsContext.project(finalEnvelope, frame.scopeChain);
        this.runtime.state.namespaceStack.replaceLayout(
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
        this.runtime.state.namespaceStack,
        this.scopeTransformsContext.append(frame.scopeChain, scopeTransforms),
      );

      for (const contribution of effectiveAllocations(scopeAllocations)) {
        pushAllocation(
          frame.allocationSink,
          contribution.boundsPoints.map(point => this.scopeTransformsContext.apply(point, scopeTransforms)),
          frame.allocationBoundary,
        );
      }

      const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
      const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
      if (transformedGuides !== undefined) frame.alignmentGuideSink.push(...transformedGuides);
    } finally {
      if (layoutPlaceholder.placeholderLayout !== undefined) this.runtime.state.namespaceStack.leaveScope();
      if (didPushNamespaceFrame) {
        this.runtime.state.namespaceStack.popFrame();
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
            this.scopeTransformsContext.apply(point, scopeTransforms),
          ),
          shadow: contribution.shadow,
        });
      }
    }
  }

  compileChild(
    child: IRChild,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileOwnerKey,
  ): void {
    try {
      this.withWarningOccurrence(occurrence, () => {
        if ('namespace' in child) {
          this.composite.compile(child, index, frame, occurrence, compositeDepth, semanticOwner);
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

  /** 从当前 traversal 状态投影 resolver 所需的窄位置上下文 */
  private positionContextOf(scopeChain: ReadonlyArray<Transform>): PositionTargetResolveContext {
    return createPositionResolveContext({
      nodeBoundaryContext: this.runtime.context.workspace.nodeBoundaryContext,
      lookupReference: id => this.runtime.state.namespaceStack.lookupReference(id),
      nodeDistance: this.runtime.context.shared.layout.nodeDistance,
      scopeChain,
      resolveExplicitBoundary: this.resolveExplicitBoundary,
      composedTransform: this.scopeTransformsContext.resolve(scopeChain),
    });
  }

  /** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
  private flushPendingPathEmissions(pendingPaths: ReadonlyArray<PendingPathEmission>): void {
    if (pendingPaths.length === 0) return;

    this.runtime.state.namespaceStack.enterResolvingPhase();

    try {
      for (const pendingPath of pendingPaths) {
        const targetResolver = createPathTargetResolver(chain => this.positionContextOf(chain));
        const { result, resolution } = this.withWarningOccurrence(pendingPath.occurrence, () =>
          compilePathState(pendingPath, targetResolver, {
            ...this.runtime.context,
            resolveTransform: this.scopeTransformsContext.resolve,
          }),
        );
        const rawPrimitives = result?.primitives ?? [];
        const primitives = this.runtime.state.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
        const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
        if (idx === -1) {
          throw createCompileInvariantError('internal: path placeholder missing from its sink');
        }

        pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
        if (pendingPath.semanticOwner !== undefined) {
          this.runtime.state.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
        }

        this.runtime.state.placeholderBalance--;

        for (const prim of primitives) recordPrimitiveZIndex(this.runtime.state.zIndexOf, prim, pendingPath.zIndex);
        if (result !== null) {
          pendingPath.boundsSink.push({
            boundsPoints: [...result.boundsPoints],
            shadow: resolution.path.shadow,
          });
          pushAllocation(pendingPath.allocationSink, [...result.boundsPoints], pendingPath.allocationBoundary);
        }
      }
    } finally {
      this.runtime.state.namespaceStack.exitResolvingPhase();
    }
  }

  /** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
  private emitNodeChild(
    child: NodeChild,
    index: number,
    frame: TraversalFrame,
    occurrence?: CompileOccurrenceLocator,
    semanticOwner?: CompileOwnerKey,
  ): void {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, scopeDefaults } = frame;
    const nodeIrPath = createCompileChildPath(locatorPrefix, index);

    const compilation = compileNodeState(child, nodeIrPath, {
      ...this.runtime.context,
      scopeDefaults,
      mode: frame.theme.mode,
      scopeChain,
      positionContext: this.positionContextOf(scopeChain),
      composedTransform: this.scopeTransformsContext.resolve(scopeChain),
      childProposal: frame.childProposal,
    });

    const { layout } = compilation;
    const globalLayout = this.scopeTransformsContext.project(layout, scopeChain);
    if (child.id) {
      this.runtime.state.namespaceStack.register(child.id, globalLayout, [...nodeIrPath, 'id']);
      child.aliasIds?.forEach((id, aliasIndex) =>
        this.runtime.state.namespaceStack.register(id, globalLayout, [...nodeIrPath, 'aliasIds', aliasIndex]),
      );
    }

    frame.publicationSink.push(globalLayout);
    const output = emitNodeOutput(compilation, this.runtime.context.shared, this.runtime.context.workspace);
    const emittedPrimitives =
      this.runtime.state.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
    if (semanticOwner !== undefined) {
      this.runtime.state.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
    }

    for (const prim of emittedPrimitives) {
      primitiveSink.push(prim);
      recordPrimitiveZIndex(this.runtime.state.zIndexOf, prim, child.zIndex);
    }

    frame.boundsSink.push(...output.bounds);
    pushAllocation(frame.allocationSink, output.bounds[0].boundsPoints, frame.allocationBoundary);
    const alignmentGuides = alignmentGuidesOfNode(layout, this.runtime.context.shared.layout.round);
    if (alignmentGuides !== undefined) {
      frame.alignmentGuideSink.push(
        ...cloneAlignmentGuides(alignmentGuides, `Node '${formatPropertyPath(nodeIrPath)}'`),
      );
    }

    layoutSink.push(layout);
  }

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
  private registerCoordinateChild(child: CoordinateChild, index: number, frame: TraversalFrame): void {
    const { scopeChain, locatorPrefix, layoutSink } = frame;
    const coordinateIrPath = createCompileChildPath(locatorPrefix, index);
    const localCenter = resolveCoordinatePosition(child, this.positionContextOf(scopeChain));

    const globalCenter =
      scopeChain.length === 0 ? localCenter : this.scopeTransformsContext.apply(localCenter, scopeChain);
    const localCoordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: localCenter[0], y: localCenter[1], width: 0, height: 0, rotate: 0 } },
      {
        shapes: this.runtime.context.shared.registries.shapeRegistry,
        boundaries: this.runtime.context.shared.registries.boundaryRegistry,
      },
    );
    const coordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
      {
        shapes: this.runtime.context.shared.registries.shapeRegistry,
        boundaries: this.runtime.context.shared.registries.boundaryRegistry,
      },
    );
    this.runtime.state.namespaceStack.register(child.id, coordinateLayout, [...coordinateIrPath, 'id']);
    frame.publicationSink.push(coordinateLayout);
    pushAllocation(frame.allocationSink, [localCenter], frame.allocationBoundary);
    layoutSink.push(localCoordinateLayout);
  }

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
  private queuePathChild(
    child: PathChild,
    index: number,
    frame: TraversalFrame,
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
          onWarn: this.runtime.context.workspace.diagnostics.collect,
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
    this.runtime.state.placeholderBalance++;
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
    const parentFrameDepth = this.runtime.state.namespaceStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = createScopePlaceholderLayout(child.id, frame.scopeChain, {
      shapes: this.runtime.context.shared.registries.shapeRegistry,
      boundaries: this.runtime.context.shared.registries.boundaryRegistry,
    });
    this.runtime.state.namespaceStack.register(
      child.id,
      placeholderLayout,
      [...scopeIrPath, 'id'],
      'scope-placeholder',
    );

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
        this.runtime.context.shared,
        this.runtime.context.workspace,
        scopeIrPath,
        resolvedClipPath,
      ),
      children: stableSortByZIndex(sealSink(scopePrimitiveSink), this.runtime.state.zIndexOf),
    };
    primitiveSink.push(group);
    if (semanticOwner !== undefined)
      this.runtime.state.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
    recordPrimitiveZIndex(this.runtime.state.zIndexOf, group, child.zIndex);

    return group.clipRef;
  }

  private compileChildren(
    children: ReadonlyArray<IRChild>,
    frame: TraversalFrame,
    useProvidedOccurrence = false,
    generatedScopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = this.options.compositeDepth ?? 0,
  ): void {
    const generated =
      generatedScopeOccurrence !== undefined || (useProvidedOccurrence ? (this.options.generated ?? false) : false);
    for (const [i, child] of children.entries()) {
      const semanticOwner =
        frame.semanticOwner === undefined
          ? undefined
          : this.runtime.state.provenanceTracker?.createOwner(
              child,
              i,
              frame.semanticOwner,
              generated,
              this.runtime.state.namespaceStack.identity,
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
        : useProvidedOccurrence && this.options.occurrence !== undefined && children.length === 1
          ? this.options.occurrence
          : {
              sourcePath: entityPath,
              expansionPath: [],
            };
      const runtimeInputs =
        useProvidedOccurrence && this.options.occurrence !== undefined && children.length === 1
          ? this.options.runtimeInputs
          : frame.runtimeInputs === undefined
            ? undefined
            : selectCompositeInputScope(frame.runtimeInputs, ['children', i]);
      this.compileChild(child, i, { ...frame, runtimeInputs }, occurrence, compositeDepth, generated, semanticOwner);
    }
  }
}
/** 编译子树；每次调用独占遍历状态 */
export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: FullCompileContext,
  options: TraversalCompileOptions = {},
): TraversalResult => new CompileTraversal(rootChildren, context, options).run();
