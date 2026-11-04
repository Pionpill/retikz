import type { CompiledScope, CompileOccurrenceLocator, IRScope, SceneClipPath, Transform } from '@retikz/core';
import {
  compileScope,
  finalizeScopeCompilation,
  prepareScopeGeometry,
  projectLayoutWithTransform,
  projectPublishedReference,
  projectScopeCompileLayouts,
  projectScopeOutputBounds,
  resolveScope,
} from '@retikz/core';
import { formatPropertyPath } from '@retikz/foundation';

import { compareCanonicalScopes, compareScopeAnimations } from '../../compare';
import type { CompileOwnerKey } from '../../provenance';
import { runCompileStage, readCompileStageCanon } from '../../runtime';
import type { CompileRuntime, CompileReferenceRead, CompileStageRecord } from '../../runtime';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { flushPendingPathEmissions } from '../path/deferred';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime, SubtreeCompileState } from '../runtime';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileOptions } from '../types';
import { emitScopeGroup } from './group';
import type { ScopeLayoutPlaceholder, ScopeLayoutPlaceholderContext, ScopeVisitHost } from './visit-types';

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
export const visitScope = (
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
): void => {
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
  const resolveInputs = { child: { ...child, children: undefined }, inheritedStyle };
  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const canon =
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
  const preparation = runtime.state.execution.namespaceStack.observeReferences(
    (name, entry, kind) => preparedReads.push({ name, entry, kind }),
    () => prepareScopeGeometry({ type: 'scope', ...canon.transform }, scopeGeometryContext),
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
    cache:
      runtime.cache === undefined
        ? undefined
        : {
            read: runtime.cache.read,
            write: (_path, _phase, record, reused) => {
              pendingRecord = { record, reused };
            },
          },
  };

  try {
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

    const geometry = runCompileStage(
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
        compileInputs: {
          preparation,
          layouts: state.geometries,
          scopeChain: transformChains,
          childCount: state.primitives.length,
          preResolvedClipPath,
        },
        resolve: () => canon,
        equals: compareCanonicalScopes,
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
            { placement: preparation },
          ),
        }),
      },
    );

    const intrinsicLayout = geometry.compiled;
    compiledScope = geometry.compiled;
    scopeTransforms = geometry.compiled.transforms;

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
  } finally {
    runtime.state.execution.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      runtime.state.execution.namespaceStack.popFrame();
    }
  }

  const finalWarningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const finalizedScope = finalizeScopeCompilation(canon, compiledScope!, state.primitives.length, scopeGeometryContext);
  if (!compareScopeAnimations(compiledScope!.animations, finalizedScope.animations)) compiledScope = finalizedScope;
  if (pendingRecord?.record.phase === 'scope') {
    const { record, reused } = pendingRecord;
    runtime.cache?.write(
      scopeGeometryContext.irPath,
      'scope',
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
