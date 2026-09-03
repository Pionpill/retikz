import type { IRChild, IRScope, LayoutChildResult, LayoutCompositeCompileContext, LayoutProposal } from '@retikz/core';
import type { IRFlexLayout, LayoutArtifactItemBase } from '@retikz/layout/compose';
import type { BoundsRect, Position } from '@retikz/math';

import { LayoutChildProbeKind } from '@retikz/core';
import { compileFlexLayout, exactLayoutProposal, requiredLayoutProbe } from '@retikz/layout/compose';
import { compileSurface } from '@retikz/standard';

import type { DiagramFoundationResolution } from '../../resolve';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import { lowerDiagramFoundation } from './lower';

/** Diagram Foundation 中一个实际 authored region 的几何 */
export type DiagramFoundationRegionGeometry = Readonly<{
  allocationBounds: Readonly<BoundsRect>;
  visualBounds: Readonly<BoundsRect>;
}>;

/** 同一次 Foundation probe 产生的完整 frame、regions 与drawing平移 */
export type DiagramFoundationComposition = Readonly<{
  frame: LayoutChildResult;
  drawingOffset: Readonly<Position>;
  regions: Readonly<{
    title?: DiagramFoundationRegionGeometry;
    description?: DiagramFoundationRegionGeometry;
    drawing: DiagramFoundationRegionGeometry;
    legend?: DiagramFoundationRegionGeometry;
  }>;
}>;

type FoundationRegionKey = 'title' | 'description' | 'drawing' | 'legend';

type FoundationPlacementState = {
  regions: Partial<Record<FoundationRegionKey, DiagramFoundationRegionGeometry>>;
  drawingOffset?: Readonly<Position>;
};

type SurfaceContentPlacement = Readonly<{
  proposal: LayoutProposal;
  result: LayoutChildResult;
}>;

const isFlexLayout = (child: IRChild): child is IRFlexLayout =>
  'namespace' in child && child.namespace === 'layout' && child.type === 'flexLayout';

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

/** 把 Layout artifact 的 container-local region 平移到 Foundation frame 坐标 */
const translateFoundationRegion = (
  item: LayoutArtifactItemBase,
  containerOffset: Readonly<Position>,
): DiagramFoundationRegionGeometry => ({
  allocationBounds: {
    x: item.allocationBounds.x + containerOffset[0],
    y: item.allocationBounds.y + containerOffset[1],
    width: item.allocationBounds.width,
    height: item.allocationBounds.height,
  },
  visualBounds: {
    x: item.visualBounds.x + containerOffset[0],
    y: item.visualBounds.y + containerOffset[1],
    width: item.visualBounds.width,
    height: item.visualBounds.height,
  },
});

const foundationCompositionFailure = (reason: string): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: `Diagram Foundation could not expose its canonical Layout placement: ${reason}`,
    details: { stage: 'assemble', path: [], reason },
  });
};

/** 用 Standard Surface compiler 捕获真实传给 content child 的 proposal 与 probe result */
const captureSurfaceContentPlacement = (
  surface: ReturnType<typeof lowerDiagramFoundation>,
  context: LayoutCompositeCompileContext,
): SurfaceContentPlacement => {
  let placement: SurfaceContentPlacement | undefined;
  compileSurface(surface, {
    ...context,
    layoutChild: (child, proposal) => {
      const probe = context.layoutChild(child, proposal);
      if (child === surface.child && probe.kind === LayoutChildProbeKind.Resolved) {
        placement = { proposal, result: probe.result };
      }
      return probe;
    },
  });
  return placement ?? foundationCompositionFailure('Surface content placement is missing.');
};

/** 从 canonical Flex compiler artifact 递归收集 Foundation 的具名 region placement */
const collectFoundationFlexRegions = (
  flex: IRFlexLayout,
  proposal: LayoutProposal,
  context: LayoutCompositeCompileContext,
  containerOffset: Readonly<Position>,
  resolution: DiagramFoundationResolution,
  state: FoundationPlacementState,
): void => {
  const artifact = compileFlexLayout(flex, { ...context, proposal }).artifact;
  if (artifact === undefined) return foundationCompositionFailure('FlexLayout returned no placement artifact.');

  artifact.items.forEach(item => {
    const authoredItem = flex.children[item.sourceIndex];
    const childOffset: Position = [containerOffset[0] + item.translation.x, containerOffset[1] + item.translation.y];
    if (item.key === 'title' || item.key === 'description' || item.key === 'drawing' || item.key === 'legend') {
      state.regions[item.key] = translateFoundationRegion(item, containerOffset);
      if (item.key === 'drawing') state.drawingOffset = childOffset;
      return;
    }
    if (item.key === 'heading') {
      const title = resolution.presentation?.title;
      const description = resolution.presentation?.description;
      if (title === undefined || description === undefined) {
        const regionKey = title === undefined ? 'description' : 'title';
        state.regions[regionKey] = translateFoundationRegion(item, containerOffset);
        return;
      }
      const headingChild = isScope(authoredItem.child) ? authoredItem.child.children[0] : authoredItem.child;
      if (!isFlexLayout(headingChild)) {
        return foundationCompositionFailure('Heading with title and description did not lower to FlexLayout.');
      }
      collectFoundationFlexRegions(
        headingChild,
        exactLayoutProposal(item.slotBounds),
        context,
        childOffset,
        resolution,
        state,
      );
      return;
    }
    if (item.key === 'main') {
      if (resolution.presentation?.legend === undefined) {
        state.regions.drawing = translateFoundationRegion(item, containerOffset);
        state.drawingOffset = childOffset;
        return;
      }
      if (!isFlexLayout(authoredItem.child)) {
        return foundationCompositionFailure('Drawing and Legend did not lower to FlexLayout.');
      }
      collectFoundationFlexRegions(
        authoredItem.child,
        exactLayoutProposal(item.slotBounds),
        context,
        childOffset,
        resolution,
        state,
      );
    }
  });
};

/** 以 Foundation lowering 为绘制真源，取得同一次compile的实际region几何 */
export const composeDiagramFoundation = (
  resolution: DiagramFoundationResolution,
  drawingChild: IRChild,
  context: LayoutCompositeCompileContext,
): DiagramFoundationComposition => {
  const surface = lowerDiagramFoundation(resolution, drawingChild);
  const contentPlacement = captureSurfaceContentPlacement(surface, context);
  const frameProbe = requiredLayoutProbe(context, { child: surface, occurrence: 0 }, context.proposal);
  const contentOffset: Position = [
    frameProbe.allocationBounds.x + surface.padding.left - contentPlacement.result.allocationBounds.x,
    frameProbe.allocationBounds.y + surface.padding.top - contentPlacement.result.allocationBounds.y,
  ];
  const state: FoundationPlacementState = { regions: {} };

  if (isFlexLayout(surface.child)) {
    collectFoundationFlexRegions(surface.child, contentPlacement.proposal, context, contentOffset, resolution, state);
  } else {
    state.regions.drawing = {
      allocationBounds: {
        x: contentPlacement.result.allocationBounds.x + contentOffset[0],
        y: contentPlacement.result.allocationBounds.y + contentOffset[1],
        width: contentPlacement.result.allocationBounds.width,
        height: contentPlacement.result.allocationBounds.height,
      },
      visualBounds: {
        x: contentPlacement.result.visualBounds.x + contentOffset[0],
        y: contentPlacement.result.visualBounds.y + contentOffset[1],
        width: contentPlacement.result.visualBounds.width,
        height: contentPlacement.result.visualBounds.height,
      },
    };
    state.drawingOffset = contentOffset;
  }

  if (state.regions.drawing === undefined || state.drawingOffset === undefined) {
    return foundationCompositionFailure('Drawing placement is missing.');
  }
  return {
    frame: frameProbe,
    drawingOffset: state.drawingOffset,
    regions: {
      ...(state.regions.title === undefined ? {} : { title: state.regions.title }),
      ...(state.regions.description === undefined ? {} : { description: state.regions.description }),
      drawing: state.regions.drawing,
      ...(state.regions.legend === undefined ? {} : { legend: state.regions.legend }),
    },
  };
};
