import type { CompiledScope, CompileOccurrenceLocator, IRScope, SceneClipPath, Transform } from '@retikz/core';
import {
  compileScope,
  prepareScopePlacement,
  projectLayoutWithTransform,
  projectPublishedReference,
  projectScopeCompileLayouts,
  projectScopeOutputBounds,
  resolveScope,
  resolveAnimations,
} from '@retikz/core';
import { formatPropertyPath, jsonStructuralEquals } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { runCompileStage, readCompileStageCanon } from '../../runtime';
import type { CompileRuntime, CompileReferenceRead, CompileStageRecord, CompileStageProducts } from '../../runtime';
import { createCompileChildPath, formatCompileOccurrence, importSceneResources } from '../../shared';
import { flushPendingPathEmissions } from '../path/deferred';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime, SubtreeCompileState } from '../runtime';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileOptions } from '../types';
import { emitScopeGroup, shouldEmitScopeGroup } from './group';
import type {
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  ScopeVisitHost,
  ScopeExecutionSteps,
} from './visit-types';

/** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
const registerScopeLayoutPlaceholder = (
  runtime: CompileRuntime,
  child: IRScope,
  input: ScopeLayoutPlaceholderContext,
): ScopeLayoutPlaceholder => {
  const { index, frame, scopeId } = input;
  const {
    context: { pathPrefix: locatorPrefix, transformChains },
  } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const parentFrameDepth = runtime.state.execution.namespaceStack.depth - 1;
  if (child.id === undefined) {
    return { parentFrameDepth };
  }

  const placeholderLayout = {
    position: runtime.state.execution.scopeTransformComposer.apply([0, 0], transformChains),
  };
  runtime.state.execution.namespaceStack.register(child.id, {
    geometry: placeholderLayout,
    irPath: [...scopeIrPath, 'id'],
    state: 'scope-placeholder',
    scopeId,
  });

  return { parentFrameDepth };
};

/** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
const prepareScopeExecution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  host: ScopeVisitHost,
  options: SubtreeCompileOptions,
  child: IRScope,
  index: number,
  frame: SubtreeCompileRuntime,
  generatedOccurrence?: CompileOccurrenceLocator,
  compositeDepth = options.compositeDepth ?? 0,
  semanticOwner?: CompileOwnerKey,
  compileNested?: (
    scopeFrame: SubtreeCompileRuntime,
    preliminaryTransforms: ReadonlyArray<Transform> | undefined,
  ) => void,
  preResolvedClipPath?: SceneClipPath,
): ScopeExecutionSteps => {
  const {
    context: {
      pathPrefix: locatorPrefix,
      transformChains,
      inheritance: inheritedStyle,
      compositeInput,
      layout: layoutContext,
    },
    state: frameState,
  } = frame;

  const themePath =
    generatedOccurrence === undefined
      ? formatPropertyPath([...createCompileChildPath(locatorPrefix, index), 'theme'])
      : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
  const retained = runtime.stages?.scopeOutput?.(createCompileChildPath(locatorPrefix, index));
  if (retained !== undefined)
    importSceneResources(
      retained.resources,
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
  const resolveInputs = { child: { ...child, children: undefined }, inheritedStyle };
  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const canon =
    retained?.value.canon ??
    readCompileStageCanon(runtime, createCompileChildPath(locatorPrefix, index), 'scope', resolveInputs) ??
    resolveScope(child, {
      nodeDistance: runtime.context.layout.nodeDistance,
      parent: inheritedStyle,
      ...runtime.context.registries,
      irPath: createCompileChildPath(locatorPrefix, index),
      themePath,
    });
  const style = canon.inheritance;
  const scopeGeometryContext = {
    positionContext: createTreePositionContext(runtime, transformChains),
    irPath: createCompileChildPath(locatorPrefix, index),
    onWarn: runtime.state.workspace.diagnosticCollector.collect,
  };
  const preparedReads: Array<CompileReferenceRead> = [];
  const preparation =
    retained?.scopePreparation ??
    runtime.state.execution.namespaceStack.observeReferences(
      (name, entry, kind) => preparedReads.push({ name, entry, kind }),
      () => prepareScopePlacement({ type: 'scope', id: canon.style.id, ...canon.transform }, scopeGeometryContext),
    );
  const preparedDiagnostics = runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount);

  // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
  // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
  const { preliminaryTransforms } = preparation;
  const preliminaryScopeChain =
    preliminaryTransforms === undefined
      ? transformChains
      : runtime.state.execution.scopeTransformComposer.append(transformChains, preliminaryTransforms);
  const scopeId = runtime.state.execution.namespaceStack.enterScope(child.id);
  const layoutPlaceholder = registerScopeLayoutPlaceholder(runtime, child, { index, frame, scopeId });

  const didPushNamespaceFrame = child.localNamespace === true;
  if (didPushNamespaceFrame) {
    runtime.state.execution.namespaceStack.pushFrame();
  }

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
  let scopeTransforms: Array<Transform> = [];
  let compiledScope: CompiledScope;
  // Scope 必须等延迟路径裁空后才能完成动画与诊断；缓存只发布完整产物
  let pendingRecord: { record: CompileStageRecord; reused: boolean } | undefined;
  const scopeRuntime: CompileRuntime = {
    ...runtime,
    stages:
      runtime.stages === undefined
        ? undefined
        : {
            ...runtime.stages,
            write: (_path, record, reused) => {
              pendingRecord = { record, reused };
            },
          },
  };

  const children = () => {
    const scopeFrame: SubtreeCompileRuntime = {
      context: {
        compositeInput,
        layout: layoutContext,
        transformChains: preliminaryScopeChain,
        pathPrefix: createCompileChildPath(locatorPrefix, index),
        ...(semanticOwner === undefined ? {} : { compileOwner: semanticOwner }),
        inheritance: style,
      },
      state,
    };

    if (compileNested === undefined) {
      host.compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
    } else {
      compileNested(scopeFrame, preliminaryTransforms);
    }
  };

  let geometry: CompileStageProducts['scope'];
  const envelope = () => {
    geometry =
      retained?.value ??
      runCompileStage(
        scopeRuntime,
        scopeGeometryContext.irPath,
        'scope',
        {
          child: { ...child, children: undefined },
          preparation,
          layouts: state.geometries,
          scopeChain: transformChains,
        },
        {
          resolveInputs,
          preparedReads,
          preparedDiagnostics,
          scopePreparation: preparation,
          compileInputs: {
            preparation,
            layouts: state.geometries,
            scopeChain: transformChains,
            childCount: state.primitives.length,
            preResolvedClipPath,
          },
          resolve: () => canon,
          compile: (stageRuntime, resolved) => ({
            canon: resolved,
            compiled: compileScope(
              resolved,
              {
                ...scopeGeometryContext,
                layouts: state.geometries,
                resolvedClipPath: preResolvedClipPath,
                registerClip: stageRuntime.state.workspace.clipRegistry.register,
                registerClipPath: stageRuntime.state.workspace.clipRegistry.registerPath,
                onWarn: stageRuntime.state.workspace.diagnosticCollector.collect,
              },
              { layout: { preparation } },
            ),
          }),
        },
      );
  };

  const project = () => {
    const intrinsicLayout = {
      shape: geometry.compiled.shape,
      boundary: geometry.compiled.boundary,
      geometry: geometry.compiled.layout.overall.geometry,
    };
    compiledScope = geometry.compiled;
    scopeTransforms = geometry.compiled.layout.overall.transforms;

    const postTransforms =
      preliminaryTransforms === undefined
        ? scopeTransforms
        : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

    for (const layout of state.publications) {
      const projected = projectPublishedReference(layout, transformChains, postTransforms);
      runtime.state.execution.namespaceStack.replacePublishedGeometry(layout, projected);
      frameState.publications.push(projected);
    }

    frameState.artifacts.push(...state.artifacts);

    for (const pendingPath of state.paths) {
      pendingPath.scopeChain = runtime.state.execution.scopeTransformComposer.insert(
        pendingPath.scopeChain,
        transformChains.length,
        postTransforms,
      );
    }

    const finalEnvelope =
      scopeTransforms.length === 0
        ? intrinsicLayout
        : projectLayoutWithTransform(
            intrinsicLayout,
            runtime.state.execution.scopeTransformComposer.resolve(scopeTransforms),
          );
    frameState.geometries.push(
      ...projectScopeCompileLayouts(child, intrinsicLayout, state.geometries, scopeTransforms),
    );
    if (child.id !== undefined) {
      const globalEnvelope = projectLayoutWithTransform(
        finalEnvelope,
        runtime.state.execution.scopeTransformComposer.resolve(transformChains),
      );
      runtime.state.execution.namespaceStack.replaceGeometry(
        child.id,
        globalEnvelope,
        layoutPlaceholder.parentFrameDepth,
        scopeId,
      );
      frameState.publications.push(globalEnvelope);
    }
  };

  const paths = () => {
    flushPendingPathEmissions(runtime, output, state.paths);
    options.captureScopeTargets?.(
      child,
      runtime.state.execution.namespaceStack,
      runtime.state.execution.scopeTransformComposer.append(transformChains, scopeTransforms),
    );

    for (const contribution of state.allocations) {
      if (contribution.skipAllocation === true) continue;
      frameState.allocations.push({
        boundsPoints: contribution.boundsPoints.map(point =>
          runtime.state.execution.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        skipAllocation: layoutContext?.skipAllocation,
      });
    }

    const structuralGuides = resolveStructuralAlignmentGuides(state.alignmentGuides);
    const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
    if (transformedGuides !== undefined) frameState.alignmentGuides.push(...transformedGuides);
  };

  const dispose = () => {
    runtime.state.execution.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      runtime.state.execution.namespaceStack.popFrame();
    }
  };

  /** 延迟路径输出收敛后绑定分组动画，裁空分组不产生动画诊断 */
  const bindScopeAnimations = (compiled: CompiledScope): CompiledScope => {
    if (retained !== undefined) return compiled;
    const animations = shouldEmitScopeGroup(
      state.primitives.length,
      compiled.layout.overall.transforms,
      compiled.emit.overall.id,
      compiled.emit.overall.clipRef !== undefined,
    )
      ? (resolveAnimations(canon.animations, {
          target: 'element',
          irPath: scopeGeometryContext.irPath,
          onWarn: scopeGeometryContext.onWarn,
        }) ?? [])
      : [];
    if (jsonStructuralEquals(compiled.emit.overall.animations ?? [], animations)) return compiled;
    return compileScope(
      canon,
      {
        ...scopeGeometryContext,
        layouts: state.geometries,
        resolvedClipPath: preResolvedClipPath,
        registerClip: runtime.state.workspace.clipRegistry.register,
        registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
        animations,
      },
      {
        layout: compiled.layout,
        emit: { clip: compiled.emit.clip ?? { clipRef: compiled.emit.overall.clipRef } },
      },
    );
  };

  const publish = () => {
    const finalWarningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
    const animatedScope = bindScopeAnimations(compiledScope!);
    compiledScope = animatedScope;
    if (pendingRecord?.record.phase === 'scope') {
      const { record, reused } = pendingRecord;
      runtime.stages?.write(
        scopeGeometryContext.irPath,
        {
          ...record,
          value: { canon, compiled: compiledScope },
          diagnostics: [
            ...record.diagnostics,
            ...runtime.state.workspace.diagnosticCollector.warnings.slice(finalWarningCount),
          ],
        },
        reused,
      );
    }
    const clipRef = emitScopeGroup(runtime, output, compiledScope, {
      scopePrimitives: state.primitives,
      frame,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
    });

    frameState.bounds.push(
      ...projectScopeOutputBounds(
        state.bounds,
        { type: 'group', transforms: scopeTransforms, ...(clipRef === undefined ? {} : { clipRef }) },
        runtime.state.workspace.clipRegistry.getResources(),
      ),
    );
  };

  return { children, envelope, project, paths, publish, dispose };
};

/** 完整构建按语义顺序执行 Scope，增量更新将实际阶段操作交给驱动 */
export const visitScope = (...args: Parameters<typeof prepareScopeExecution>): void => {
  const [, , host, , , index, frame] = args;
  const prepare = () => prepareScopeExecution(...args);
  if (host.scheduleScope !== undefined) {
    host.scheduleScope(createCompileChildPath(frame.context.pathPrefix, index), prepare);
    return;
  }
  const steps = prepare();
  try {
    steps.children();
    steps.envelope();
    steps.project();
    steps.paths();
  } finally {
    steps.dispose();
  }
  steps.publish();
};
