import type {
  CompiledScope,
  CanonicalScope,
  CompileOccurrenceLocator,
  IRScope,
  SceneClipPath,
  Transform,
} from '@retikz/core';
import {
  compileScope,
  prepareScopePlacement,
  projectLayoutWithTransform,
  projectPublishedReference,
  projectScopeCompileLayouts,
  projectScopeOutputBounds,
  resolveScope,
} from '@retikz/core';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { createCompileObservation } from '../../runtime';
import type { CompileRuntime, CompileReferenceRead, CompileObservationFacts } from '../../runtime';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { flushPendingPathEmissions } from '../leaf';
import { createTreePositionContext, resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileRuntime, SubtreeCompileState, SubtreeCompileOptions } from '../subtree';
import { emitScopeGroup } from './group';
import { bindScopeOutputAnimations } from './output';
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
export const prepareScopeExecution = (
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
  resolvedScope?: CanonicalScope,
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
  const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
  const canon =
    resolvedScope ??
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
  let outputDiagnostics: ScopeExecutionSteps['outputDiagnostics'] = [];

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

  const compileContext = {
    ...scopeGeometryContext,
    layouts: state.geometries,
    resolvedClipPath: preResolvedClipPath,
    registerClip: runtime.state.workspace.clipRegistry.register,
    registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
  };

  const project = (compiled: CompiledScope) => {
    const intrinsicLayout = {
      shape: compiled.shape,
      boundary: compiled.boundary,
      geometry: compiled.layout.overall.geometry,
    };
    compiledScope = compiled;
    scopeTransforms = compiled.layout.overall.transforms;

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
    const transformedGuides = transformAlignmentGuides(
      structuralGuides,
      scopeTransforms,
      runtime.state.execution.scopeTransformComposer.resolve,
    );
    if (transformedGuides !== undefined) frameState.alignmentGuides.push(...transformedGuides);
  };

  const dispose = () => {
    runtime.state.execution.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      runtime.state.execution.namespaceStack.popFrame();
    }
  };

  const publish = () => {
    const bound = bindScopeOutputAnimations(canon, compiledScope!, state.primitives.length, {
      ...scopeGeometryContext,
      layouts: state.geometries,
      resolvedClipPath: preResolvedClipPath,
      registerClip: runtime.state.workspace.clipRegistry.register,
      registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
    });
    compiledScope = bound.compiled;
    for (const warning of bound.diagnostics) runtime.state.workspace.diagnosticCollector.collect(warning);
    outputDiagnostics = bound.diagnostics;
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

  return {
    children,
    project,
    paths,
    publish,
    dispose,
    childFrame: {
      context: {
        compositeInput,
        layout: layoutContext,
        transformChains: preliminaryScopeChain,
        pathPrefix: scopeGeometryContext.irPath,
        compileOwner: semanticOwner,
        inheritance: style,
      },
      state,
    },
    get transforms() {
      return scopeTransforms;
    },
    get compiled() {
      return compiledScope;
    },
    preparation,
    canon,
    preparedReads,
    preparedDiagnostics,
    compileContext,
    get outputDiagnostics() {
      return outputDiagnostics;
    },
  };
};

/** 完整构建按语义顺序执行 Scope，增量更新将实际阶段操作交给驱动 */
export const visitScope = (...args: Parameters<typeof prepareScopeExecution>): void => {
  const [runtime, , , , , index, frame] = args;
  const steps = prepareScopeExecution(...args);
  let facts: CompileObservationFacts | undefined;
  let childCount = 0;
  try {
    steps.children();
    childCount = steps.childFrame.state.primitives.length;
    const observation = runtime.onCompiled === undefined ? undefined : createCompileObservation(runtime);
    const local = observation?.runtime ?? runtime;
    const context = {
      ...steps.compileContext,
      registerClip: local.state.workspace.clipRegistry.register,
      registerClipPath: local.state.workspace.clipRegistry.registerPath,
      onWarn: local.state.workspace.diagnosticCollector.collect,
    };
    const compile = () => compileScope(steps.canon, context, { layout: { preparation: steps.preparation } });
    const compiled =
      observation === undefined
        ? compile()
        : runtime.state.execution.namespaceStack.observeReferences(observation.read, compile);
    facts = observation?.facts();
    steps.project(compiled);
    steps.paths();
  } finally {
    steps.dispose();
  }
  steps.publish();
  if (facts !== undefined)
    runtime.onCompiled?.(
      createCompileChildPath(frame.context.pathPrefix, index),
      frame.context,
      {
        kind: 'scope',
        canon: steps.canon,
        compiled: steps.compiled,
        preparation: steps.preparation,
        layouts: steps.compileContext.layouts,
        childCount,
        resolvedClipPath: steps.compileContext.resolvedClipPath,
        outputDiagnostics: steps.outputDiagnostics,
      },
      {
        ...facts,
        reads: [...steps.preparedReads, ...facts.reads],
        diagnostics: [...steps.preparedDiagnostics, ...facts.diagnostics],
      },
    );
};
