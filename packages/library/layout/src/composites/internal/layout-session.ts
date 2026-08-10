import type {
  CompositeCompileChild,
  IRChild,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
} from '@retikz/core';

import { LayoutAxisProposalKind, LayoutChildProbeKind, LayoutIntrinsicMode } from '@retikz/core';

import type { LayoutArtifactItemBase, LayoutOverflowValue } from '../shared';
import type { LayoutRect } from './geometry';

import { LayoutOverflow } from '../shared';
import { createLayoutArtifactItem } from './artifact';
import { layoutClipOf } from './geometry';

/** 绑定一个待布局 child 与稳定的 authored occurrence */
export type LayoutChildHandle = Readonly<{
  child: IRChild;
  occurrence: number;
}>;

/** child 在 minimum 与 natural intrinsic proposal 下的结构结果 */
export type MeasuredLayoutChild = Readonly<{
  minimum: LayoutChildResult;
  natural: LayoutChildResult;
}>;

/** child 最终 slot、translation 与共享布局 artifact */
export type PlacedLayoutChild = Readonly<{
  result: LayoutChildResult;
  slotBounds: LayoutRect;
  translation: Readonly<{ x: number; y: number }>;
  baseArtifact: LayoutArtifactItemBase;
}>;

/** 从最终结构 slot 构造双轴 exact proposal */
export const exactLayoutProposal = (slot: LayoutRect): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Exact, value: slot.width },
  y: { kind: LayoutAxisProposalKind.Exact, value: slot.height },
});

/** 构造双轴 minimum 或 natural intrinsic proposal */
export const intrinsicLayoutProposal = (mode: 'minimum' | 'natural'): LayoutProposal => {
  const intrinsicMode = mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural;
  return {
    x: { kind: LayoutAxisProposalKind.Intrinsic, mode: intrinsicMode },
    y: { kind: LayoutAxisProposalKind.Intrinsic, mode: intrinsicMode },
  };
};

/** 执行一次必须成功的 child probe，并保留 Core failure occurrence */
export const requiredLayoutProbe = (
  context: LayoutCompositeCompileContext,
  handle: LayoutChildHandle,
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(handle.child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

/** 取得 child 的 minimum / natural 双轴结构 contribution */
export const measureLayoutChild = (
  context: LayoutCompositeCompileContext,
  handle: LayoutChildHandle,
): MeasuredLayoutChild =>
  Object.freeze({
    minimum: requiredLayoutProbe(context, handle, intrinsicLayoutProposal('minimum')),
    natural: requiredLayoutProbe(context, handle, intrinsicLayoutProposal('natural')),
  });

/** 以最终 slot 完成 child exact probe、平移与共享 artifact 构造 */
export const placeLayoutChild = (
  input: Readonly<{
    context: LayoutCompositeCompileContext;
    handle: LayoutChildHandle;
    slotBounds: LayoutRect;
    key: string;
    sourceIndex: number;
    containerAllocation: LayoutRect;
    overflow: LayoutOverflowValue;
    existingResult?: LayoutChildResult;
  }>,
): PlacedLayoutChild => {
  const result =
    input.existingResult ?? requiredLayoutProbe(input.context, input.handle, exactLayoutProposal(input.slotBounds));
  const translation = Object.freeze({
    x: input.slotBounds.x - result.allocationBounds.x,
    y: input.slotBounds.y - result.allocationBounds.y,
  });
  const baseArtifact = createLayoutArtifactItem({
    key: input.key,
    sourceIndex: input.sourceIndex,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    slotBounds: input.slotBounds,
    result,
    translation,
    containerAllocation: input.containerAllocation,
    overflow: input.overflow,
  });
  return Object.freeze({
    result,
    slotBounds: input.slotBounds,
    translation,
    baseArtifact,
  });
};

/** replay 已选 child，并按 container overflow 建立布局 clip scope */
export const replayLayoutChildren = (
  context: LayoutCompositeCompileContext,
  children: ReadonlyArray<PlacedLayoutChild>,
  allocation: LayoutRect,
  overflow: LayoutOverflowValue,
): CompositeCompileChild => {
  const replayed = children.map(child =>
    context.replay(child.result, {
      transforms: [{ kind: 'translate', x: child.translation.x, y: child.translation.y }],
    }),
  );
  return context.scope(overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {}, replayed);
};
