import type { IRBoxSpacing, IRClipSpec, LayoutAxisProposal } from '@retikz/core';

import { resolveBoxSpacing } from '@retikz/core';

import type { IRLayoutAxisSize, LayoutAlignmentValue } from '../shared';

import { LayoutAlignment, LayoutAxisSizeKind } from '../shared';

/** Layout solver 使用的有限非负矩形 */
export type LayoutRect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Layout solver 使用的四边 spacing */
export type LayoutInsets = Readonly<{ top: number; right: number; bottom: number; left: number }>;

/** 以 content-box、target、anchor 与 offset 构造 positioned child slot */
export type PositionedLayoutSlotInput = Readonly<{
  content: LayoutRect;
  at: Readonly<{ x: number; y: number }>;
  anchor: Readonly<{ x: number; y: number }>;
  offset: Readonly<{ x: number; y: number }>;
  size: Readonly<{ width: number; height: number }>;
}>;

/** 单轴容器尺寸求值输入 */
export type ResolveLayoutAxisSizeInput = Readonly<{
  axis: 'x' | 'y';
  policy: IRLayoutAxisSize;
  proposal: LayoutAxisProposal;
  minimumContribution: number;
  naturalContribution: number;
}>;

/** 单轴容器真实 allocation 与可用父级空间 */
export type ResolvedLayoutAxisSize = Readonly<{
  allocationSize: number;
  finiteAvailable?: number;
}>;

/** 校验 solver 中间数值是有限非负数 */
const finiteNonNegative = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative`);
  return value;
};

/** 校验布局矩形的坐标有限且尺寸有限非负 */
const finiteLayoutRect = (rect: LayoutRect, label: string): LayoutRect => {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new Error(`${label} origin must be finite`);
  }
  finiteNonNegative(rect.width, `${label} width`);
  finiteNonNegative(rect.height, `${label} height`);
  return rect;
};

/** 复用 Overlay positioned placement 的 container-local slot 公式 */
export const positionedLayoutSlotOf = (input: PositionedLayoutSlotInput): LayoutRect =>
  finiteLayoutRect(
    {
      x: input.content.x + input.at.x + input.offset.x - input.anchor.x * input.size.width,
      y: input.content.y + input.at.y + input.offset.y - input.anchor.y * input.size.height,
      width: input.size.width,
      height: input.size.height,
    },
    'Positioned layout slot',
  );

/** 按可选作者边界钳制尺寸 */
const clampAuthoredSize = (value: number, policy: IRLayoutAxisSize): number => {
  if (policy.kind === LayoutAxisSizeKind.Fixed) return policy.value;
  const atLeastMinimum = Math.max(value, policy.min ?? 0);
  return policy.max === undefined ? atLeastMinimum : Math.min(atLeastMinimum, policy.max);
};

/** 从 Core proposal 读取当前轴唯一合法的有限父级 available */
const finiteAvailableOf = (proposal: LayoutAxisProposal): number | undefined => {
  if (proposal.kind === 'exact') return proposal.value;
  if (proposal.kind === 'range') return proposal.max;
  return undefined;
};

/** 根据作者策略、child contribution 与 Core proposal 求容器真实单轴 allocation */
export const resolveLayoutAxisSize = (input: ResolveLayoutAxisSizeInput): ResolvedLayoutAxisSize => {
  const minimum = finiteNonNegative(input.minimumContribution, 'minimumContribution');
  const natural = finiteNonNegative(input.naturalContribution, 'naturalContribution');
  const finiteAvailable = finiteAvailableOf(input.proposal);

  if (input.policy.kind === LayoutAxisSizeKind.Fixed) {
    return {
      allocationSize: input.policy.value,
      ...(finiteAvailable === undefined ? {} : { finiteAvailable }),
    };
  }

  if (input.policy.kind === LayoutAxisSizeKind.Fill) {
    if (finiteAvailable === undefined) {
      throw new Error(`Standard layout fill requires a finite parent allocation on ${input.axis}`);
    }
    return { allocationSize: clampAuthoredSize(finiteAvailable, input.policy), finiteAvailable };
  }

  let candidate = natural;
  if (input.proposal.kind === 'intrinsic') {
    candidate = input.proposal.mode === 'minimum' ? minimum : natural;
  } else if (input.proposal.kind === 'exact') {
    candidate = input.proposal.value;
  }
  let allocationSize = clampAuthoredSize(candidate, input.policy);
  if (input.proposal.kind === 'range') {
    const intersectionMin = Math.max(input.policy.min ?? 0, input.proposal.min);
    const intersectionMax = Math.min(input.policy.max ?? Number.MAX_VALUE, input.proposal.max ?? Number.MAX_VALUE);
    if (intersectionMin <= intersectionMax) {
      allocationSize = Math.min(Math.max(allocationSize, intersectionMin), intersectionMax);
    }
  }

  return {
    allocationSize,
    ...(finiteAvailable === undefined ? {} : { finiteAvailable }),
  };
};

/** 把作者 spacing 规范化为完整四边值 */
export const normalizeLayoutSpacing = (value: number | IRBoxSpacing | undefined): LayoutInsets =>
  resolveBoxSpacing(value, 0);

/** 以内边距从 container allocation 得到 content rect */
export const contentRectOf = (allocation: LayoutRect, padding: LayoutInsets): LayoutRect =>
  finiteLayoutRect(
    {
      x: allocation.x + padding.left,
      y: allocation.y + padding.top,
      width: Math.max(0, allocation.width - padding.left - padding.right),
      height: Math.max(0, allocation.height - padding.top - padding.bottom),
    },
    'Content rect',
  );

/** 以 margin 向外扩张 child rect */
export const outsetLayoutRect = (rect: LayoutRect, margin: LayoutInsets): LayoutRect =>
  finiteLayoutRect(
    {
      x: rect.x - margin.left,
      y: rect.y - margin.top,
      width: rect.width + margin.left + margin.right,
      height: rect.height + margin.top + margin.bottom,
    },
    'Outset rect',
  );

/** 计算真实 child allocation bounds 放入父 slot 所需的单轴 translation */
export const alignAllocationInSlot = (
  slot: LayoutRect,
  allocation: LayoutRect,
  axis: 'x' | 'y',
  alignment: LayoutAlignmentValue,
): number => {
  const slotStart = axis === 'x' ? slot.x : slot.y;
  const slotSize = axis === 'x' ? slot.width : slot.height;
  const allocationStart = axis === 'x' ? allocation.x : allocation.y;
  const allocationSize = axis === 'x' ? allocation.width : allocation.height;
  if (alignment === LayoutAlignment.End || alignment === LayoutAlignment.LastBaseline) {
    return slotStart + slotSize - allocationStart - allocationSize;
  }
  if (alignment === LayoutAlignment.Center) {
    return slotStart + slotSize / 2 - allocationStart - allocationSize / 2;
  }
  return slotStart - allocationStart;
};

/** 为 container allocation 构造正面积 rect 或零面积退化 path clip */
export const layoutClipOf = (size: Readonly<{ width: number; height: number }>): IRClipSpec => {
  finiteNonNegative(size.width, 'clip width');
  finiteNonNegative(size.height, 'clip height');
  if (size.width > 0 && size.height > 0) {
    return { kind: 'rect', x: 0, y: 0, width: size.width, height: size.height };
  }
  return {
    kind: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [size.width, 0] },
      { kind: 'line', to: [size.width, size.height] },
      { kind: 'line', to: [0, size.height] },
      { kind: 'close' },
    ],
  };
};
