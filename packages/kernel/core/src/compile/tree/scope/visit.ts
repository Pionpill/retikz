import { formatPropertyPath } from '@retikz/foundation';
import { boundsToRect } from '@retikz/math';

import type { CompileOccurrenceLocator, SceneClipPath, Transform } from '../../../contract';
import { resolveScopeDefaults, resolveTheme } from '../../../resolve';
import type { CompileOwnerKey } from '../../provenance';
import { allocationPointsOf, collectLayoutBounds, calculateBoundsOfPrimitives } from '../../scene';
import { createCompileChildPath, formatCompileOccurrence } from '../../shared';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../alignment-guide';
import { effectiveAllocations, pushAllocation } from '../allocation';
import type { CompileExecutionContext } from '../context/execution';
import { createTreePositionContext } from '../context/execution';
import type { TreeCompileFrame } from '../frame';
import { createCompileSinks } from '../frame';
import { createScopePlaceholderLayout, projectPublishedCompileLayout } from '../node';
import type { TreeOutputState } from '../output';
import { flushPendingPathEmissions } from '../path/deferred';
import type { ScopeChild, SubtreeCompilerOptions } from '../types';
import { compileScopeGeometry, prepareScopeGeometry } from './compile';
import { projectScopeCompileLayouts } from './index';
import { emitScopeGroup } from './output';
import type { ScopeLayoutPlaceholder, ScopeLayoutPlaceholderContext, ScopeVisitHost } from './types';

/** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
const registerScopeLayoutPlaceholder = (
  context: CompileExecutionContext,
  child: ScopeChild,
  input: ScopeLayoutPlaceholderContext,
): ScopeLayoutPlaceholder => {
  const { index, frame } = input;
  const { locatorPrefix } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const parentFrameDepth = context.namespaceStack.depth - 1;
  if (child.id === undefined) {
    return { parentFrameDepth };
  }

  const placeholderLayout = createScopePlaceholderLayout(child.id, frame.scopeChain, {
    shapes: context.shared.registries.shapeRegistry,
    boundaries: context.shared.registries.boundaryRegistry,
  });
  context.namespaceStack.register(child.id, placeholderLayout, [...scopeIrPath, 'id'], 'scope-placeholder');

  return { parentFrameDepth, placeholderLayout };
};

/** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
export const visitScope = (
  context: CompileExecutionContext,
  output: TreeOutputState,
  host: ScopeVisitHost,
  options: SubtreeCompilerOptions,
  child: ScopeChild,
  index: number,
  frame: TreeCompileFrame,
  generatedOccurrence?: CompileOccurrenceLocator,
  compositeDepth = options.initial.compositeDepth ?? 0,
  semanticOwner?: CompileOwnerKey,
  compileNested?: (scopeFrame: TreeCompileFrame, preliminaryTransforms: ReadonlyArray<Transform> | undefined) => void,
  preResolvedClipPath?: SceneClipPath,
): void => {
  const { locatorPrefix, scopeDefaults } = frame;

  const themePath =
    generatedOccurrence === undefined
      ? formatPropertyPath([...createCompileChildPath(locatorPrefix, index), 'theme'])
      : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
  const theme = resolveTheme(frame.theme, child.theme, themePath, context.shared.registries.themeRegistry);
  const scopeGeometryContext = {
    positionContext: createTreePositionContext(context, frame.scopeChain),
    irPath: createCompileChildPath(locatorPrefix, index),
    onWarn: context.workspace.diagnostics.collect,
  };
  const preparation = prepareScopeGeometry(child, scopeGeometryContext);

  // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
  // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 布局发布结果
  const { preliminaryTransforms } = preparation;
  const preliminaryScopeChain =
    preliminaryTransforms === undefined
      ? frame.scopeChain
      : context.scopeTransformComposer.append(frame.scopeChain, preliminaryTransforms);
  const layoutPlaceholder = registerScopeLayoutPlaceholder(context, child, { index, frame });
  if (layoutPlaceholder.placeholderLayout !== undefined) {
    context.namespaceStack.enterScope(layoutPlaceholder.placeholderLayout, child.id!);
  }

  const didPushNamespaceFrame = child.localNamespace === true;
  if (didPushNamespaceFrame) {
    context.namespaceStack.pushFrame();
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
  } = createCompileSinks();
  let scopeTransforms: Array<Transform> = [];

  try {
    const scopeFrame: TreeCompileFrame = {
      runtimeInputs: frame.runtimeInputs,
      childProposal: frame.childProposal,
      scopeChain: preliminaryScopeChain,
      primitiveSink: scopePrimitiveSink,
      locatorPrefix: createCompileChildPath(locatorPrefix, index),
      layoutSink: scopeLayouts,
      pathSink: scopePendingPaths,
      scopeDefaults: resolveScopeDefaults(child.defaults, scopeDefaults),
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
      host.compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
    } else {
      compileNested(scopeFrame, preliminaryTransforms);
    }

    const geometry = compileScopeGeometry(child, preparation, scopeLayouts, context.shared, scopeGeometryContext);
    const intrinsicLayout = geometry.envelope;
    scopeTransforms = geometry.transforms;

    const postTransforms =
      preliminaryTransforms === undefined
        ? scopeTransforms
        : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

    for (const layout of scopePublications) {
      const projected = projectPublishedCompileLayout(layout, frame.scopeChain, postTransforms);
      context.namespaceStack.replacePublishedLayout(layout, projected);
      frame.publicationSink.push(projected);
    }

    frame.artifactSink.push(...scopeArtifacts);

    for (const pendingPath of scopePendingPaths) {
      pendingPath.scopeChain = context.scopeTransformComposer.insert(
        pendingPath.scopeChain,
        frame.scopeChain.length,
        postTransforms,
      );
    }

    const finalEnvelope =
      scopeTransforms.length === 0
        ? intrinsicLayout
        : context.scopeTransformComposer.project(intrinsicLayout, scopeTransforms);
    frame.layoutSink.push(...projectScopeCompileLayouts(child, intrinsicLayout, scopeLayouts, scopeTransforms));
    if (child.id !== undefined) {
      const globalEnvelope = context.scopeTransformComposer.project(finalEnvelope, frame.scopeChain);
      context.namespaceStack.replaceLayout(
        child.id,
        globalEnvelope,
        layoutPlaceholder.parentFrameDepth,
        layoutPlaceholder.placeholderLayout,
      );
      frame.publicationSink.push(globalEnvelope);
    }

    flushPendingPathEmissions(context, output, scopePendingPaths);
    options.captureScopeTargets?.(
      child,
      context.namespaceStack,
      context.scopeTransformComposer.append(frame.scopeChain, scopeTransforms),
    );

    for (const contribution of effectiveAllocations(scopeAllocations)) {
      pushAllocation(
        frame.allocationSink,
        contribution.boundsPoints.map(point => context.scopeTransformComposer.apply(point, scopeTransforms)),
        frame.allocationBoundary,
      );
    }

    const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
    const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
    if (transformedGuides !== undefined) frame.alignmentGuideSink.push(...transformedGuides);
  } finally {
    if (layoutPlaceholder.placeholderLayout !== undefined) context.namespaceStack.leaveScope();
    if (didPushNamespaceFrame) {
      context.namespaceStack.popFrame();
    }
  }

  const clipRef = emitScopeGroup(context, output, child, {
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
        context.workspace.clipRegistry.getResources(),
      );
      if (projected !== undefined)
        frame.boundsSink.push({ boundsPoints: allocationPointsOf(projected), decoration: true });
    } else {
      frame.boundsSink.push({
        boundsPoints: contribution.boundsPoints.map(point =>
          context.scopeTransformComposer.apply(point, scopeTransforms),
        ),
        shadow: contribution.shadow,
      });
    }
  }
};
