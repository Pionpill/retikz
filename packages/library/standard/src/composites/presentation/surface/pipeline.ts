import type {
  IRClip,
  IRPath,
  LayoutAxisProposal,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import { LayoutAxisProposalKind, rectOutline } from '@retikz/core';
import { LayoutOverflow, requiredLayoutProbe } from '@retikz/layout/compose';

import type { IRSurface } from './types';

import { SURFACE_HANDLE_KEY, SURFACE_HANDLE_ROLE } from './constants';

type SurfaceAxis = 'x' | 'y';

/** 取得一个物理轴两侧的 Surface padding 总量 */
const axisPadding = (surface: IRSurface, axis: SurfaceAxis): number =>
  axis === 'x' ? surface.padding.left + surface.padding.right : surface.padding.top + surface.padding.bottom;

/** 把 Surface 收到的单轴 proposal 转成 content child proposal */
const childAxisProposal = (proposal: LayoutAxisProposal, padding: number, axis: SurfaceAxis): LayoutAxisProposal => {
  if (proposal.kind === LayoutAxisProposalKind.Intrinsic) return proposal;
  if (proposal.kind === LayoutAxisProposalKind.Exact) {
    if (proposal.value < padding) {
      throw new Error(`standard.surface ${axis} exact proposal cannot fit Surface padding`);
    }
    return { kind: LayoutAxisProposalKind.Exact, value: proposal.value - padding };
  }
  if (proposal.max !== undefined && proposal.max < padding) {
    throw new Error(`standard.surface ${axis} range proposal cannot fit Surface padding`);
  }
  return {
    kind: LayoutAxisProposalKind.Range,
    min: Math.max(0, proposal.min - padding),
    ...(proposal.max === undefined ? {} : { max: proposal.max - padding }),
  };
};

/** 把 Surface parent proposal 转成唯一 child 的 content proposal */
const childProposal = (surface: IRSurface, proposal: LayoutProposal): LayoutProposal => ({
  x: childAxisProposal(proposal.x, axisPadding(surface, 'x'), 'x'),
  y: childAxisProposal(proposal.y, axisPadding(surface, 'y'), 'y'),
});

/** 解析 Surface 在当前轴的最终 border-box 尺寸 */
const surfaceAxisSize = (proposal: LayoutAxisProposal, childSlotSize: number, padding: number): number =>
  proposal.kind === LayoutAxisProposalKind.Exact ? proposal.value : childSlotSize + padding;

/** 构造 Surface background 或 border 共用的矩形 Path */
const surfaceBoundaryPath = (
  width: number,
  height: number,
  cornerRadius: number,
  appearance: Omit<IRPath, 'type' | 'children'>,
): IRPath => ({
  ...appearance,
  type: 'path',
  children: [
    {
      type: 'step',
      kind: 'rectangle',
      from: [0, 0],
      to: [width, height],
      ...(cornerRadius === 0 ? {} : { cornerRadius }),
    },
  ],
});

/** 构造与 Surface rounded boundary 一致的 content clip */
const surfaceClip = (width: number, height: number, cornerRadius: number): IRClip => ({
  kind: 'path',
  commands: rectOutline([0, 0], [width, height], cornerRadius),
});

/** 将一个 canonical Surface 编译为普通 Core Scope/Path/replay 输出 */
export const compileSurface = (
  surface: IRSurface,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult => {
  const child = requiredLayoutProbe(
    context,
    { child: surface.child, occurrence: 0 },
    childProposal(surface, context.proposal),
  );
  const width = surfaceAxisSize(context.proposal.x, child.slotSize.width, axisPadding(surface, 'x'));
  const height = surfaceAxisSize(context.proposal.y, child.slotSize.height, axisPadding(surface, 'y'));
  const allocationBounds = { x: 0, y: 0, width, height };
  const cornerRadius = Math.min(surface.cornerRadius, width / 2, height / 2);
  const replay = context.replay(child, {
    transforms: [
      {
        kind: 'translate',
        x: surface.padding.left - child.allocationBounds.x,
        y: surface.padding.top - child.allocationBounds.y,
      },
    ],
  });
  const content = context.scope(
    {
      zIndex: 0,
      ...(surface.overflow === LayoutOverflow.Clip ? { clip: surfaceClip(width, height, cornerRadius) } : {}),
    },
    [replay],
  );
  const background =
    surface.background === undefined
      ? []
      : [
          surfaceBoundaryPath(width, height, cornerRadius, {
            zIndex: -1,
            fill: surface.background.fill,
            ...(surface.background.fillOpacity === undefined ? {} : { fillOpacity: surface.background.fillOpacity }),
            stroke: 'none',
          }),
        ];
  const border =
    surface.border === undefined
      ? []
      : [
          surfaceBoundaryPath(width, height, cornerRadius, {
            ...surface.border,
            zIndex: 1,
            fill: 'none',
          }),
        ];
  const {
    namespace: _namespace,
    type: _type,
    child: _child,
    padding: _padding,
    overflow: _overflow,
    background: _background,
    border: _border,
    cornerRadius: _cornerRadius,
    ...scopeProps
  } = surface;
  void _namespace;
  void _type;
  void _child;
  void _padding;
  void _overflow;
  void _background;
  void _border;
  void _cornerRadius;

  return {
    allocationBounds,
    children: [
      context.scope(
        scopeProps,
        [...background, content, ...border],
        [
          {
            key: SURFACE_HANDLE_KEY,
            role: SURFACE_HANDLE_ROLE,
            bounds: allocationBounds,
          },
        ],
      ),
    ],
  };
};
