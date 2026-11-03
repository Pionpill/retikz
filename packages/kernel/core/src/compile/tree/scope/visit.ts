import { formatPropertyPath } from '@retikz/foundation';
import { boundsToRect } from '@retikz/math';

import type { CompileOccurrenceLocator, SceneClipPath, Transform } from '../../../contract';
import { resolveScopeDefaults, resolveTheme } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { allocationPointsOf, collectLayoutBounds, calculateBoundsOfPrimitives } from '../../scene';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../alignment-guide';
import { effectiveAllocations, pushAllocation } from '../allocation';
import { projectLayoutWithTransform, createScopePlaceholderLayout, projectPublishedCompileLayout } from '../node';
import type { TreeOutputState } from '../output';
import { flushPendingPathEmissions } from '../path/deferred';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { createSubtreeCompileState } from '../runtime';
import type { SubtreeCompilerOptions } from '../types';
import { compileScopeGeometry, prepareScopeGeometry } from './compile';
import { projectScopeCompileLayouts } from './index';
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
    context: { locatorPrefix },
  } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const parentFrameDepth = runtime.state.execution.namespaceStack.depth - 1;
  if (child.id === undefined) {
    return { parentFrameDepth };
  }

  const placeholderLayout = createScopePlaceholderLayout(child.id, frame.context.scopeChain, {
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
  options: SubtreeCompilerOptions,
  child: IRScope,
  index: number,
  frame: SubtreeCompileRuntime,
  generatedOccurrence?: CompileOccurrenceLocator,
  compositeDepth = options.initial.compositeDepth ?? 0,
  semanticOwner?: CompileOwnerKey,
  compileNested?: (
    scopeFrame: SubtreeCompileRuntime,
    preliminaryTransforms: ReadonlyArray<Transform> | undefined,
  ) => void,
  preResolvedClipPath?: SceneClipPath,
): void => {
  const {
    context: {
      locatorPrefix,
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
    positionContext: createTreePositionContext(runtime, frame.context.scopeChain),
    irPath: createCompileChildPath(locatorPrefix, index),
    onWarn: runtime.state.workspace.diagnosticCollector.collect,
  };
  const preparation = prepareScopeGeometry(child, scopeGeometryContext);

  // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
  // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
  const { preliminaryTransforms } = preparation;
  const preliminaryScopeChain =
    preliminaryTransforms === undefined
      ? frame.context.scopeChain
      : runtime.state.execution.scopeTransformComposer.append(frame.context.scopeChain, preliminaryTransforms);
  const scopeId = runtime.state.execution.namespaceStack.enterScope(child.id);
  const layoutPlaceholder = registerScopeLayoutPlaceholder(runtime, child, { index, frame, scopeId });

  const didPushNamespaceFrame = child.localNamespace === true;
  if (didPushNamespaceFrame) {
    runtime.state.execution.namespaceStack.pushFrame();
  }

  const {
    primitiveSink: scopePrimitiveSink,
    layoutSink: scopeLayouts,
    pathSink: scopePendingPaths,
    publicationSink: scopePublications,
    boundsSink: scopeBounds,
    allocationSink: scopeAllocations,
    alignmentGuideSink: scopeAlignmentGuides,
    artifactSink: scopeArtifacts,
  } = createSubtreeCompileState();
  let scopeTransforms: Array<Transform> = [];

  try {
    const scopeFrame: SubtreeCompileRuntime = {
      context: {
        runtimeInputs: frame.context.runtimeInputs,
        childProposal: frame.context.childProposal,
        scopeChain: preliminaryScopeChain,
        locatorPrefix: createCompileChildPath(locatorPrefix, index),
        ...(frame.context.allocationBoundary === undefined
          ? {}
          : { allocationBoundary: frame.context.allocationBoundary }),
        ...(semanticOwner === undefined ? {} : { semanticOwner }),
        style: { defaults: resolveScopeDefaults(child.defaults, scopeDefaults), theme },
      },
      state: {
        primitiveSink: scopePrimitiveSink,
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        publicationSink: scopePublications,
        boundsSink: scopeBounds,
        allocationSink: scopeAllocations,
        alignmentGuideSink: scopeAlignmentGuides,
        artifactSink: scopeArtifacts,
      },
    };
    if (compileNested === undefined) {
      host.compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
    } else {
      compileNested(scopeFrame, preliminaryTransforms);
    }

    const geometry = compileScopeGeometry(child, preparation, scopeLayouts, runtime.context, scopeGeometryContext);
    const intrinsicLayout = geometry.envelope;
    scopeTransforms = geometry.transforms;

    const postTransforms =
      preliminaryTransforms === undefined
        ? scopeTransforms
        : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

    for (const layout of scopePublications) {
      const projected = projectPublishedCompileLayout(layout, frame.context.scopeChain, postTransforms);
      runtime.state.execution.namespaceStack.replacePublishedLayout(layout, projected);
      frame.state.publicationSink.push(projected);
    }

    frame.state.artifactSink.push(...scopeArtifacts);

    for (const pendingPath of scopePendingPaths) {
      pendingPath.scopeChain = runtime.state.execution.scopeTransformComposer.insert(
        pendingPath.scopeChain,
        frame.context.scopeChain.length,
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
    frame.state.layoutSink.push(...projectScopeCompileLayouts(child, intrinsicLayout, scopeLayouts, scopeTransforms));
    if (child.id !== undefined) {
      const globalEnvelope = projectLayoutWithTransform(
        finalEnvelope,
        runtime.state.execution.scopeTransformComposer.resolve(frame.context.scopeChain),
      );
      runtime.state.execution.namespaceStack.replaceLayout(
        child.id,
        globalEnvelope,
        layoutPlaceholder.parentFrameDepth,
        scopeId,
      );
      frame.state.publicationSink.push(globalEnvelope);
    }

    flushPendingPathEmissions(runtime, output, scopePendingPaths);
    options.captureScopeTargets?.(
      child,
      runtime.state.execution.namespaceStack,
      runtime.state.execution.scopeTransformComposer.append(frame.context.scopeChain, scopeTransforms),
    );

    for (const contribution of effectiveAllocations(scopeAllocations)) {
      pushAllocation(
        frame.state.allocationSink,
        contribution.boundsPoints.map(point =>
          runtime.state.execution.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        frame.context.allocationBoundary,
      );
    }

    const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
    const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
    if (transformedGuides !== undefined) frame.state.alignmentGuideSink.push(...transformedGuides);
  } finally {
    runtime.state.execution.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      runtime.state.execution.namespaceStack.popFrame();
    }
  }

  const clipRef = emitScopeGroup(runtime, output, child, {
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
        frame.state.boundsSink.push({ boundsPoints: allocationPointsOf(projected), decoration: true });
    } else {
      frame.state.boundsSink.push({
        boundsPoints: contribution.boundsPoints.map(point =>
          runtime.state.execution.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        shadow: contribution.shadow,
      });
    }
  }
};
