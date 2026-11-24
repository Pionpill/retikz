import type { CompiledScope, IRScope, Transform } from '@retikz/core';
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

import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { flushPendingPathEmissions } from '../leaf';
import { createTreePositionContext, resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileRuntime, SubtreeCompileState } from '../subtree';
import { bindScopeOutputAnimations, emitScopeGroup } from './group';
import type {
  ScopeLayoutPlaceholderContext,
  ScopeVisitHost,
  ScopeExecutionOptions,
  ScopeExecutionSteps,
} from './types';

/** 有 scope.id 时注册占位布局，返回后续替换所需的父 namespace frame 深度 */
const registerScopeLayoutPlaceholder = (
  runtime: CompileRuntime,
  ir: IRScope,
  input: ScopeLayoutPlaceholderContext,
): number => {
  const { index, frame, scopeId } = input;
  const {
    context: { pathPrefix: locatorPrefix, transformChains },
  } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const parentFrameDepth = runtime.state.execution.namespaceStack.depth - 1;
  if (ir.id === undefined) {
    return parentFrameDepth;
  }

  const placeholderLayout = {
    position: runtime.state.execution.scopeTransformComposer.apply([0, 0], transformChains),
  };
  runtime.state.execution.namespaceStack.register(ir.id, {
    geometry: placeholderLayout,
    irPath: [...scopeIrPath, 'id'],
    state: 'scope-placeholder',
    scopeId,
  });

  return parentFrameDepth;
};

/** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
export const prepareScopeExecution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  host: ScopeVisitHost,
  ir: IRScope,
  index: number,
  frame: SubtreeCompileRuntime,
  options: ScopeExecutionOptions = {},
): ScopeExecutionSteps => {
  const {
    captureScopeTargets,
    compositeDepth = 0,
    generatedOccurrence,
    semanticOwner,
    compileNested,
    preResolvedClipPath,
    resolvedScope,
  } = options;
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
  const canon =
    resolvedScope ??
    resolveScope(ir, {
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
  const preparation = prepareScopePlacement(
    { type: 'scope', id: canon.style.id, ...canon.transform },
    scopeGeometryContext,
  );

  // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
  // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
  const { preliminaryTransforms } = preparation;
  const preliminaryScopeChain =
    preliminaryTransforms === undefined
      ? transformChains
      : runtime.state.execution.scopeTransformComposer.append(transformChains, preliminaryTransforms);
  const scopeId = runtime.state.execution.namespaceStack.enterScope(ir.id);
  const parentFrameDepth = registerScopeLayoutPlaceholder(runtime, ir, { index, frame, scopeId });

  const didPushNamespaceFrame = ir.localNamespace === true;
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
      host.compileChildren(ir.children, scopeFrame, false, generatedOccurrence, compositeDepth);
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
    frameState.geometries.push(...projectScopeCompileLayouts(ir, intrinsicLayout, state.geometries, scopeTransforms));
    if (ir.id !== undefined) {
      const globalEnvelope = projectLayoutWithTransform(
        finalEnvelope,
        runtime.state.execution.scopeTransformComposer.resolve(transformChains),
      );
      runtime.state.execution.namespaceStack.replaceGeometry(ir.id, globalEnvelope, parentFrameDepth, scopeId);
      frameState.publications.push(globalEnvelope);
    }
  };

  const paths = () => {
    flushPendingPathEmissions(runtime, output, state.paths);
    captureScopeTargets?.(
      ir,
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
    const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms, chain =>
      runtime.state.execution.scopeTransformComposer.resolve(chain),
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
    const clipRef = emitScopeGroup(runtime, output, compiledScope, {
      scopePrimitives: state.primitives,
      frame,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
    });

    frameState.bounds.push(
      ...projectScopeOutputBounds(
        state.bounds,
        { type: 'group', transforms: scopeTransforms, ...(clipRef === undefined ? {} : { clipRef }) },
        { paints: [], clips: runtime.state.workspace.clipRegistry.getResources() },
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
    compileContext,
  };
};

/** 完整构建按语义顺序执行 Scope，增量更新将实际阶段操作交给驱动 */
export const visitScope = (...args: Parameters<typeof prepareScopeExecution>): void => {
  const steps = prepareScopeExecution(...args);
  try {
    steps.children();
    const compiled = compileScope(steps.canon, steps.compileContext, { layout: { preparation: steps.preparation } });
    steps.project(compiled);
    steps.paths();
  } finally {
    steps.dispose();
  }
  steps.publish();
};
