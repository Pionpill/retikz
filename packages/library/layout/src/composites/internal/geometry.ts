import type { IRBoxSpacing, IRClip, LayoutAxisProposal } from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import type { BoundsRect } from '@retikz/math';

import { RetikzLayoutError, RetikzLayoutErrorCode } from '../../errors';
import type { IRLayoutAxisSize } from '../shared';
import { LayoutAlignment, LayoutAxisSizeKind } from '../shared';

/** Layout solver 使用的有限非负矩形 */
export type LayoutRect = Readonly<BoundsRect>;

/** Layout solver 使用的四边 spacing */
export type LayoutInsets = Readonly<{
  /** 上侧边距 */
  top: number;
  /** 右侧边距 */
  right: number;
  /** 下侧边距 */
  bottom: number;
  /** 左侧边距 */
  left: number;
}>;

/** 以 content-box、target、anchor 与 offset 构造 positioned child slot */
export type PositionedLayoutSlotInput = Readonly<{
  /** 提供局部原点的容器内容矩形 */
  content: LayoutRect;
  /** 相对内容矩形原点的目标位置 */
  at: Readonly<{
    /** 目标相对内容原点的水平坐标 */
    x: number;
    /** 目标相对内容原点的垂直坐标 */
    y: number;
  }>;
  /** 按槽位宽高归一化的锚点比例 */
  anchor: Readonly<{
    /** 锚点在槽位宽度上的归一化位置 */
    x: number;
    /** 锚点在槽位高度上的归一化位置 */
    y: number;
  }>;
  /** 锚点定位后额外应用的物理偏移 */
  offset: Readonly<{
    /** 额外水平偏移量 */
    x: number;
    /** 额外垂直偏移量 */
    y: number;
  }>;
  /** 被定位槽位的固定宽高 */
  size: Readonly<{
    /** 槽位宽度 */
    width: number;
    /** 槽位高度 */
    height: number;
  }>;
}>;

/** 单轴容器尺寸求值输入 */
export type ResolveLayoutAxisSizeInput = Readonly<{
  /** 当前求解的水平或垂直轴 */
  axis: 'x' | 'y';
  /** 作者声明的当前轴尺寸策略 */
  policy: IRLayoutAxisSize;
  /** 父布局传入的尺寸提案 */
  proposal: LayoutAxisProposal;
  /** 子内容对当前轴的最小尺寸贡献 */
  minimumContribution: number;
  /** 子内容对当前轴的自然尺寸贡献 */
  naturalContribution: number;
}>;

/** 单轴容器真实 allocation 与可用父级空间 */
export type ResolvedLayoutAxisSize = Readonly<{
  /** 当前轴实际分配的尺寸 */
  allocationSize: number;
  /** 父提案中的有限尺寸或上限，固有尺寸提案时省略 */
  finiteAvailable?: number;
}>;

/** 校验 solver 中间数值是有限非负数 */
const finiteNonNegative = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: `${label} must be finite and non-negative`,
      details: { label, value },
    });
  }

  return value;
};

/** 校验布局矩形的坐标有限且尺寸有限非负 */
const finiteLayoutRect = (rect: LayoutRect, label: string): LayoutRect => {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new RetikzLayoutError({
      code: RetikzLayoutErrorCode.GeometryInvalid,
      message: `${label} origin must be finite`,
      details: { label, x: rect.x, y: rect.y },
    });
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
      throw new RetikzLayoutError({
        code: RetikzLayoutErrorCode.GeometryInvalid,
        message: `Layout fill requires a finite parent allocation on ${input.axis}`,
        details: { axis: input.axis, policy: input.policy.kind },
      });
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
  alignment: LayoutAlignment,
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

/** 为 container allocation 构造 Core rect clip，零尺寸表示空裁剪区域 */
export const layoutClipOf = (size: Readonly<{ width: number; height: number }>): IRClip => {
  finiteNonNegative(size.width, 'clip width');
  finiteNonNegative(size.height, 'clip height');
  return { kind: 'rect', x: 0, y: 0, width: size.width, height: size.height };
};
