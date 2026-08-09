import type {
  CompositeCompileChild,
  IRNodeTarget,
  IRPathBase,
  LayoutAxisProposal,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '@retikz/core';
import type { LayoutArtifactRect } from '@retikz/standard/layout';

import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';
import { unionLayoutArtifactRects } from '@retikz/standard/layout';

import type { LogicDiagramTarget } from '../shared';
import type { CalloutArtifact, IRCallout } from './types';

import { compileLogicShell } from '../internal/content-shell';

type SideGeometry = Readonly<{
  targetAnchor: 'top' | 'right' | 'bottom' | 'left';
  shellAnchor: 'top' | 'right' | 'bottom' | 'left';
  normal: readonly [number, number];
  tangent: readonly [number, number];
}>;

const sideGeometryOf = (side: IRCallout['placement']['side']): SideGeometry => {
  switch (side) {
    case 'top':
      return { targetAnchor: 'top', shellAnchor: 'bottom', normal: [0, -1], tangent: [1, 0] };
    case 'right':
      return { targetAnchor: 'right', shellAnchor: 'left', normal: [1, 0], tangent: [0, 1] };
    case 'bottom':
      return { targetAnchor: 'bottom', shellAnchor: 'top', normal: [0, 1], tangent: [1, 0] };
    case 'left':
      return { targetAnchor: 'left', shellAnchor: 'right', normal: [-1, 0], tangent: [0, 1] };
  }
};

const lowerTarget = (target: LogicDiagramTarget, fallbackAnchor: SideGeometry['targetAnchor']): IRNodeTarget => {
  if ('section' in target && target.section !== undefined) {
    throw new Error(`Unsupported Callout section target: ${target.section}`);
  }
  return {
    id: target.id,
    anchor: target.anchor ?? fallbackAnchor,
    ...(target.offset === undefined ? {} : { offset: target.offset }),
  };
};

const addPlacementOffset = (
  target: LogicDiagramTarget,
  geometry: SideGeometry,
  placement: IRCallout['placement'],
): [number, number] => [
  (target.offset?.[0] ?? 0) + geometry.normal[0] * placement.gap + geometry.tangent[0] * placement.offset,
  (target.offset?.[1] ?? 0) + geometry.normal[1] * placement.gap + geometry.tangent[1] * placement.offset,
];

const shellAnchorOf = (allocation: LayoutArtifactRect, anchor: SideGeometry['shellAnchor']): [number, number] => {
  const centerX = allocation.x + allocation.width / 2;
  const centerY = allocation.y + allocation.height / 2;
  if (anchor === 'top') return [centerX, allocation.y];
  if (anchor === 'right') return [allocation.x + allocation.width, centerY];
  if (anchor === 'bottom') return [centerX, allocation.y + allocation.height];
  return [allocation.x, centerY];
};

const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

const proposalOf = (x: LayoutAxisProposal, y: LayoutAxisProposal) => ({ x, y });

const positiveRect = (rect: LayoutArtifactRect): LayoutArtifactRect | null =>
  rect.width > 0 && rect.height > 0 ? rect : null;

/** 编译显式 Callout placement、单段 Core leader 与 strict artifact */
export const compileCallout = (
  node: IRCallout,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<CalloutArtifact> => {
  const geometry = sideGeometryOf(node.placement.side);
  const target = lowerTarget(node.target, geometry.targetAnchor);
  const shell = compileLogicShell(node, context);
  const shellAnchor = shellAnchorOf(shell.allocation, geometry.shellAnchor);
  const leaderFrom: [number, number] = [
    shellAnchor[0] - geometry.normal[0] * node.placement.gap - geometry.tangent[0] * node.placement.offset,
    shellAnchor[1] - geometry.normal[1] * node.placement.gap - geometry.tangent[1] * node.placement.offset,
  ];
  const placementTarget: IRNodeTarget = {
    ...target,
    offset: addPlacementOffset(node.target, geometry, node.placement),
  };

  let leaderChild: CompositeCompileChild | undefined;
  let leaderArtifact: CalloutArtifact['leader'] = null;
  let leaderVisualBounds: LayoutArtifactRect | null = null;
  if (node.leader !== false) {
    const leaderAppearance = node.leader;
    const probePath: IRPathBase = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: leaderFrom },
        { type: 'step', kind: 'line', to: shellAnchor },
      ],
      ...leaderAppearance,
    };
    const probe = context.layoutChild(
      probePath,
      proposalOf(intrinsicProposal('natural'), intrinsicProposal('natural')),
    );
    if (probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);
    leaderVisualBounds = probe.result.visualBounds;
    leaderArtifact = { from: leaderFrom, to: shellAnchor, visualBounds: leaderVisualBounds };
    leaderChild = context.replay(probe.result);
  }

  const outerVisualBounds = unionLayoutArtifactRects([
    shell.outer.visualBounds,
    ...(leaderVisualBounds === null ? [] : [leaderVisualBounds]),
  ]);
  const visibleCandidates = [
    ...(shell.outer.visibleBounds === null ? [] : [shell.outer.visibleBounds]),
    ...(leaderVisualBounds === null || positiveRect(leaderVisualBounds) === null ? [] : [leaderVisualBounds]),
  ];
  const outerVisibleBounds = visibleCandidates.length === 0 ? null : unionLayoutArtifactRects(visibleCandidates);
  const outer = Object.freeze({
    allocationBounds: shell.outer.allocationBounds,
    shellVisualBounds: shell.outer.shellVisualBounds,
    visualBounds: Object.freeze(outerVisualBounds),
    visibleBounds: outerVisibleBounds === null ? null : Object.freeze(outerVisibleBounds),
  });
  const output = context.scope(
    {
      placement: { target: placementTarget, selfAnchor: shellAnchor },
      zIndex: node.appearance.zIndex,
    },
    [
      shell.shellChild,
      ...(shell.contentChild === undefined ? [] : [shell.contentChild]),
      ...(leaderChild === undefined ? [] : [leaderChild]),
    ],
  );
  const artifact: CalloutArtifact = Object.freeze({
    kind: 'callout',
    id: node.id,
    target: node.target,
    placement: node.placement,
    outer,
    container: shell.container,
    content: shell.contentArtifact as CalloutArtifact['content'],
    leader: leaderArtifact,
  });
  return {
    children: [output],
    allocationBounds: shell.allocation,
    artifact,
  };
};
