import type { BoundsRect } from '@retikz/math';

import type { LayoutAxisProposal, LayoutProposal } from '../../contract';
import type { CompileOccurrenceLocator } from '../../contract';

import { LayoutAxisProposalKind, LayoutIntrinsicMode } from '../../contract';
import { isRetikzCompositeContractError,RetikzCompositeContractError } from '../../resolve/diagnostics';
import { formatCompileOccurrence } from '../artifact';

/** 把负零规范化为稳定的正零 */
const canonicalizeZero = (value: number): number => (Object.is(value, -0) ? 0 : value);

/** 创建带 composite occurrence 的非法 proposal 错误 */
const invalidProposal = (compositeKey: string, occurrence: CompileOccurrenceLocator, detail: string): never => {
  throw new RetikzCompositeContractError(
    `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} called layoutChild with an invalid proposal; ${detail}.`,
  );
};

/** 校验对象只含指定自有字段 */
const validateKeys = (
  input: Record<PropertyKey, unknown>,
  allowedKeys: ReadonlySet<PropertyKey>,
  label: string,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): void => {
  const unsupportedKeys = Reflect.ownKeys(input).filter(key => !allowedKeys.has(key));
  if (unsupportedKeys.length > 0) {
    invalidProposal(
      compositeKey,
      occurrence,
      `${label} contains unsupported field(s): ${unsupportedKeys.map(String).join(', ')}`,
    );
  }
};

/** 校验并规范化有限非负数 */
const finiteNonNegative = (
  value: unknown,
  field: string,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return invalidProposal(compositeKey, occurrence, `${field} must be finite and non-negative`);
  }
  return canonicalizeZero(value);
};

/** 校验、脱离并冻结单轴 proposal */
const cloneLayoutAxisProposal = (
  axis: unknown,
  axisName: 'x' | 'y',
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutAxisProposal => {
  if (axis === null || typeof axis !== 'object' || Array.isArray(axis)) {
    return invalidProposal(compositeKey, occurrence, `${axisName} must be an object`);
  }
  const input = axis as Record<PropertyKey, unknown>;
  const kind = input.kind;
  if (kind === LayoutAxisProposalKind.Intrinsic) {
    validateKeys(input, new Set(['kind', 'mode']), axisName, compositeKey, occurrence);
    const mode = input.mode;
    if (mode !== LayoutIntrinsicMode.Minimum && mode !== LayoutIntrinsicMode.Natural) {
      return invalidProposal(compositeKey, occurrence, `${axisName}.mode has unknown value '${String(mode)}'`);
    }
    return Object.freeze({ kind: LayoutAxisProposalKind.Intrinsic, mode });
  }
  if (kind === LayoutAxisProposalKind.Range) {
    validateKeys(input, new Set(['kind', 'min', 'max']), axisName, compositeKey, occurrence);
    if (!Object.hasOwn(input, 'min')) {
      return invalidProposal(compositeKey, occurrence, `${axisName}.min is required`);
    }
    const minValue = input.min;
    const maxValue = input.max;
    const min = finiteNonNegative(minValue, `${axisName}.min`, compositeKey, occurrence);
    const max =
      maxValue === undefined ? undefined : finiteNonNegative(maxValue, `${axisName}.max`, compositeKey, occurrence);
    if (max !== undefined && min > max) {
      return invalidProposal(compositeKey, occurrence, `${axisName}.min must not exceed ${axisName}.max`);
    }
    return Object.freeze({
      kind: LayoutAxisProposalKind.Range,
      min,
      ...(max === undefined ? {} : { max }),
    });
  }
  if (kind === LayoutAxisProposalKind.Exact) {
    validateKeys(input, new Set(['kind', 'value']), axisName, compositeKey, occurrence);
    if (!Object.hasOwn(input, 'value')) {
      return invalidProposal(compositeKey, occurrence, `${axisName}.value is required`);
    }
    const value = input.value;
    return Object.freeze({
      kind: LayoutAxisProposalKind.Exact,
      value: finiteNonNegative(value, `${axisName}.value`, compositeKey, occurrence),
    });
  }
  return invalidProposal(compositeKey, occurrence, `${axisName}.kind has unknown value '${String(kind)}'`);
};

/** 校验、脱离、规范化并递归冻结完整双轴 proposal */
export const cloneLayoutProposal = (
  proposal: unknown,
  compositeKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutProposal => {
  try {
    if (proposal === null || typeof proposal !== 'object' || Array.isArray(proposal)) {
      return invalidProposal(compositeKey, occurrence, 'expected an object with x and y axes');
    }
    const input = proposal as Record<PropertyKey, unknown>;
    validateKeys(input, new Set(['x', 'y']), 'proposal', compositeKey, occurrence);
    if (!Object.hasOwn(input, 'x') || !Object.hasOwn(input, 'y')) {
      return invalidProposal(compositeKey, occurrence, 'both x and y axes are required');
    }
    const x = input.x;
    const y = input.y;
    return Object.freeze({
      x: cloneLayoutAxisProposal(x, 'x', compositeKey, occurrence),
      y: cloneLayoutAxisProposal(y, 'y', compositeKey, occurrence),
    });
  } catch (cause) {
    if (isRetikzCompositeContractError(cause)) throw cause;
    return invalidProposal(compositeKey, occurrence, 'proposal validation failed');
  }
};

/** 按真实 allocation contribution 与 proposal 解析无原点 slot */
export const resolveLayoutSlotSize = (
  allocationBounds: Readonly<BoundsRect>,
  proposal: LayoutProposal,
): Readonly<{ width: number; height: number }> => {
  const resolveAxis = (actual: number, axis: LayoutAxisProposal): number => {
    if (axis.kind === LayoutAxisProposalKind.Exact) return axis.value;
    if (axis.kind === LayoutAxisProposalKind.Range) {
      const upperBounded = axis.max === undefined ? actual : Math.min(axis.max, actual);
      return canonicalizeZero(Math.max(axis.min, upperBounded));
    }
    return canonicalizeZero(actual);
  };
  return Object.freeze({
    width: resolveAxis(allocationBounds.width, proposal.x),
    height: resolveAxis(allocationBounds.height, proposal.y),
  });
};
