import type { CompileOccurrenceLocator } from '../../contract';
import type { IRTransform } from '../../schemas';
import type { DuplicateRegisterInfo } from '../namespace';
import type { CompileWarning, CompileWarningInput } from '../warning';

import { compareCompileOccurrences } from '../../contract';
import { CompileWarningCode } from '../constants';
import { freezeOccurrence } from './artifact';

const compileWarningOccurrence = Symbol('compileWarningOccurrence');

type OrderedCompileWarning = CompileWarningInput & {
  [compileWarningOccurrence]?: CompileOccurrenceLocator;
};

/** 按 transform 失败来源选择 warning code */
export const transformWarnCode = (failed: IRTransform | undefined): CompileWarningInput['code'] => {
  switch (failed?.kind) {
    case 'offset-translate':
      return CompileWarningCode.OffsetBaseUnresolved;
    case 'at-translate':
      return CompileWarningCode.AtTargetUnresolved;
    case 'polar-translate':
      return CompileWarningCode.PolarOriginUnresolved;
    default:
      return CompileWarningCode.UnresolvedNodeReference;
  }
};

/** 格式化重复 id warning */
export const createDuplicateWarning = (info: DuplicateRegisterInfo): CompileWarningInput => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const firstLoc = info.firstIrPath ?? '(unknown earlier location)';
  const secondLoc = info.secondIrPath ?? '(unknown current location)';
  return {
    code: CompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: secondLoc,
  };
};

/** 为内部 warning 绑定完整 occurrence，公开结构仍只保留 code/message/path */
export const withCompileWarningOccurrence = (
  warning: CompileWarningInput,
  occurrence: CompileOccurrenceLocator | undefined,
): CompileWarningInput => {
  if (occurrence === undefined || compileWarningOccurrence in warning) return warning;
  return replaceCompileWarningOccurrence(warning, occurrence);
};

/** 强制替换内部 warning occurrence，供 replay placement 重映射 */
export const replaceCompileWarningOccurrence = (
  warning: CompileWarningInput,
  occurrence: CompileOccurrenceLocator,
): CompileWarningInput => {
  const ordered: OrderedCompileWarning = { ...warning };
  Object.defineProperty(ordered, compileWarningOccurrence, { value: freezeOccurrence(occurrence) });
  return ordered;
};

/** 读取 warning 的完整 occurrence；root/global warning 回退到公开 locator */
export const compileWarningOccurrenceOf = (warning: CompileWarningInput): CompileOccurrenceLocator =>
  (warning as OrderedCompileWarning)[compileWarningOccurrence] ?? {
    sourcePath: warning.path,
    expansionPath: [],
  };

/** 按 canonical occurrence 排序 warning，并保留同 occurrence 的 emission 顺序 */
export const orderCompileWarnings = (warnings: ReadonlyArray<CompileWarningInput>): Array<CompileWarning> =>
  warnings
    .map((warning, emissionOrder) => ({
      warning,
      emissionOrder,
      occurrence: compileWarningOccurrenceOf(warning),
    }))
    .sort(
      (left, right) =>
        compareCompileOccurrences(left.occurrence, right.occurrence) || left.emissionOrder - right.emissionOrder,
    )
    .map(({ warning }) =>
      Object.freeze({
        code: warning.code,
        message: warning.message,
        path: warning.path,
        origin: warning.origin ?? ({ kind: 'primary' } as const),
      }),
    );
