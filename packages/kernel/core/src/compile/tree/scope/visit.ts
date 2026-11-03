import { formatPropertyPath } from '@retikz/foundation';
import { boundsToRect } from '@retikz/math';

import type { CompileOccurrenceLocator, SceneClipPath, Transform } from '../../../contract';
import { resolveScopeDefaults, resolveTheme } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { allocationPointsOf, collectLayoutBounds, calculateBoundsOfPrimitives } from '../../scene';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { projectLayoutWithTransform, createScopePlaceholderLayout, projectPublishedCompileLayout } from '../node';
import { flushPendingPathEmissions } from '../path';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime, SubtreeCompileState } from '../runtime';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileOptions } from '../types';
import { compileScopeGeometry, prepareScopeGeometry } from './compile';
import { projectScopeCompileLayouts } from './layout';
import { emitScopeGroup } from './output';
import type { ScopeLayoutPlaceholder, ScopeLayoutPlaceholderContext, ScopeVisitHost } from './types';

/** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
const registerScopeLayoutPlaceholder = (
  runtime: CompileRuntime,
  child: IRScope,
  input: ScopeLayoutPlaceholderContext,
): ScopeLayoutPlaceholder => {
  const { index, frame, scopeId } = input;
  const {
    context: { pathPrefix: locatorPrefix },
  } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const parentFrameDepth = runtime.state.execution.namespaceStack.depth - 1;
  if (child.id === undefined) {
    return { parentFrameDepth };
  }

  const placeholderLayout = createScopePlaceholderLayout(child.id, frame.context.transformChains, {
    shapes: runtime.context.registries.shapeRegistry,
    boundaries: runtime.context.registries.boundaryRegistry,
  });
  runtime.state.execution.namespaceStack.register(child.id, {
    layout: placeholderLayout,
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
      style: { defaults: scopeDefaults },
    },
  } = frame;

  const themePath =
    generatedOccurrence === undefined
      ? formatPropertyPath([...createCompileChildPath(locatorPrefix, index), 'theme'])
      : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
  const theme = resolveTheme(
    frame.context.style.theme,
    child.theme,
    themePath,
    runtime.context.registries.themeRegistry,
  );
  const scopeGeometryContext = {
    positionContext: createTreePositionContext(runtime, frame.context.transformChains),
    irPath: createCompileChildPath(locatorPrefix, index),
    onWarn: runtime.state.workspace.diagnosticCollector.collect,
  };
  const preparation = prepareScopeGeometry(child, scopeGeometryContext);

  // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
  // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
  const { preliminaryTransforms } = preparation;
  const preliminaryScopeChain =
    preliminaryTransforms === undefined
      ? frame.context.transformChains
      : runtime.state.execution.scopeTransformComposer.append(frame.context.transformChains, preliminaryTransforms);
  const scopeId = runtime.state.execution.namespaceStack.enterScope(child.id);
  const layoutPlaceholder = registerScopeLayoutPlaceholder(runtime, child, { index, frame, scopeId });

  const didPushNamespaceFrame = child.localNamespace === true;
  if (didPushNamespaceFrame) {
    runtime.state.execution.namespaceStack.pushFrame();
  }

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
  let scopeTransforms: Array<Transform> = [];

  try {
    const scopeFrame: SubtreeCompileRuntime = {
      context: {
        compositeInput: frame.context.compositeInput,
        layout: frame.context.layout,
        transformChains: preliminaryScopeChain,
        pathPrefix: createCompileChildPath(locatorPrefix, index),
        ...(semanticOwner === undefined ? {} : { compileOwner: semanticOwner }),
        style: { defaults: resolveScopeDefaults(child.defaults, scopeDefaults), theme },
      },
      state,
    };
    if (compileNested === undefined) {
      host.compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
    } else {
      compileNested(scopeFrame, preliminaryTransforms);
    }

    const geometry = compileScopeGeometry(child, preparation, state.layouts, runtime.context, scopeGeometryContext);
    const intrinsicLayout = geometry.envelope;
    scopeTransforms = geometry.transforms;

    const postTransforms =
      preliminaryTransforms === undefined
        ? scopeTransforms
        : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

    for (const layout of state.publications) {
      const projected = projectPublishedCompileLayout(layout, frame.context.transformChains, postTransforms);
      runtime.state.execution.namespaceStack.replacePublishedLayout(layout, projected);
      frame.state.publications.push(projected);
    }

    frame.state.artifacts.push(...state.artifacts);

    for (const pendingPath of state.paths) {
      pendingPath.scopeChain = runtime.state.execution.scopeTransformComposer.insert(
        pendingPath.scopeChain,
        frame.context.transformChains.length,
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
    frame.state.layouts.push(...projectScopeCompileLayouts(child, intrinsicLayout, state.layouts, scopeTransforms));
    if (child.id !== undefined) {
      const globalEnvelope = projectLayoutWithTransform(
        finalEnvelope,
        runtime.state.execution.scopeTransformComposer.resolve(frame.context.transformChains),
      );
      runtime.state.execution.namespaceStack.replaceLayout(
        child.id,
        globalEnvelope,
        layoutPlaceholder.parentFrameDepth,
        scopeId,
      );
      frame.state.publications.push(globalEnvelope);
    }

    flushPendingPathEmissions(runtime, output, state.paths);
    options.captureScopeTargets?.(
      child,
      runtime.state.execution.namespaceStack,
      runtime.state.execution.scopeTransformComposer.append(frame.context.transformChains, scopeTransforms),
    );

    for (const contribution of state.allocations) {
      if (contribution.skipAllocation === true) continue;
      frame.state.allocations.push({
        boundsPoints: contribution.boundsPoints.map(point =>
          runtime.state.execution.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        skipAllocation: frame.context.layout?.skipAllocation,
      });
    }

    const structuralGuides = resolveStructuralAlignmentGuides(state.alignmentGuides);
    const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
    if (transformedGuides !== undefined) frame.state.alignmentGuides.push(...transformedGuides);
  } finally {
    runtime.state.execution.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      runtime.state.execution.namespaceStack.popFrame();
    }
  }

  const clipRef = emitScopeGroup(runtime, output, child, {
    index,
    scopeTransforms,
    scopePrimitives: state.primitives,
    frame,
    ...(semanticOwner === undefined ? {} : { semanticOwner }),
    ...(preResolvedClipPath === undefined ? {} : { resolvedClipPath: preResolvedClipPath }),
  });

  for (const contribution of state.bounds) {
    if (contribution.decoration === true) {
      const bounds = collectLayoutBounds(undefined, contribution.boundsPoints);
      if (bounds === undefined) continue;

      const rectangle = boundsToRect(bounds);
      const projected = calculateBoundsOfPrimitives(
        [
          {
            type: 'group',
            transforms: scopeTransforms,
            ...(clipRef === undefined ? {} : { clipRef }),
            children: [{ type: 'rect', ...rectangle, fill: 'black' }],
          },
        ],
        runtime.state.workspace.clipRegistry.getResources(),
      );
      if (projected !== undefined)
        frame.state.bounds.push({ boundsPoints: allocationPointsOf(projected), decoration: true });
    } else {
      frame.state.bounds.push({
        boundsPoints: contribution.boundsPoints.map(point =>
          runtime.state.execution.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        shadow: contribution.shadow,
      });
    }
  }
};
