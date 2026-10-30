import type { BoundsRect } from '@retikz/math';

import type { CompileOccurrenceLocator, LayoutAxisProposal, LayoutProposal } from '../../contract';
import { LayoutAxisProposalKind } from '../../contract';
import { createCompositeContractError, isCompositeContractError } from '../../resolve/diagnostics';
import { formatCompileOccurrence } from '../artifact';

/** 把负零规范化为稳定的正零 */
const canonicalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

/** 创建带 composite occurrence 的非法 proposal 错误 */
const invalidProposal = (compositeKey: string, occurrence: CompileOccurrenceLocator, detail: string): never => {
  throw createCompositeContractError(
    `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} called layoutChild with an invalid proposal; ${detail}.`,
  );
};

/** 校验并规范化有限非负数 */
const finiteNonNegative = (
  value: number,
  field: string,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): number => {
  if (!Number.isFinite(value) || value < 0) {
    return invalidProposal(compositeKey, occurrence, `${field} must be finite and non-negative`);
  }

  return canonicalizeZero(value);
};

/** 校验数值不变量并脱离、冻结单轴 proposal */
const cloneLayoutAxisProposal = (
  axis: LayoutAxisProposal,
  axisName: 'x' | 'y',
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutAxisProposal => {
  const { kind } = axis;
  if (kind === LayoutAxisProposalKind.Intrinsic) {
    return Object.freeze({ kind, mode: axis.mode });
  }
  if (kind === LayoutAxisProposalKind.Range) {
    const min = finiteNonNegative(axis.min, `${axisName}.min`, compositeKey, occurrence);
    const upper = axis.max;
    const max = upper === undefined ? undefined : finiteNonNegative(upper, `${axisName}.max`, compositeKey, occurrence);
    if (max !== undefined && min > max) {
      return invalidProposal(compositeKey, occurrence, `${axisName}.min must not exceed ${axisName}.max`);
    }
    return Object.freeze({ kind, min, ...(max === undefined ? {} : { max }) });
  }
  return Object.freeze({
    kind,
    value: finiteNonNegative(axis.value, `${axisName}.value`, compositeKey, occurrence),
  });
};

/** 校验数值、脱离并冻结已类型化的双轴 proposal */
export const cloneLayoutProposal = (
  proposal: LayoutProposal,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutProposal => {
  try {
    return Object.freeze({
      x: cloneLayoutAxisProposal(proposal.x, 'x', compositeKey, occurrence),
      y: cloneLayoutAxisProposal(proposal.y, 'y', compositeKey, occurrence),
    });
  } catch (cause) {
    if (isCompositeContractError(cause)) throw cause;
    return invalidProposal(compositeKey, occurrence, 'proposal validation failed');
  }
};

/** 按真实 allocation contribution 与 proposal 解析无原点 slot */
export const resolveLayoutSlotSize = (
  allocationBounds: Readonly<BoundsRect>,
  proposal: LayoutProposal,
): Readonly<{ width: number; height: number }> => {
  return Object.freeze({
    width: resolveLayoutAxisSlotSize(allocationBounds.width, proposal.x),
    height: resolveLayoutAxisSlotSize(allocationBounds.height, proposal.y),
  });
};

/** 按真实单轴 allocation 贡献解析提案槽位 */
export const resolveLayoutAxisSlotSize = (actual: number, axis: LayoutAxisProposal): number => {
  if (axis.kind === LayoutAxisProposalKind.Exact) return axis.value;
  if (axis.kind === LayoutAxisProposalKind.Range) {
    const upperBounded = axis.max === undefined ? actual : Math.min(axis.max, actual);
    return canonicalizeZero(Math.max(axis.min, upperBounded));
  }

  return canonicalizeZero(actual);
};
