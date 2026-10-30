import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../contract';
import { compareCompileOccurrences } from '../contract';
import type { IRTransform } from '../schemas';
import { freezeOccurrence } from './artifact';
import { BuiltinCompileWarningCode } from './constants';
import type { DuplicateRegisterInfo } from './namespace';
import type { CompileWarning, InputCompileWarning } from './warning';

const compileWarningOccurrence = Symbol('compileWarningOccurrence');

/** 为调用方维护的名称 frame 生成与全量编译一致的重名诊断 */
export const createDuplicateCompileWarning = (
  info: Pick<DuplicateRegisterInfo, 'id' | 'frameDepth' | 'firstIrPath' | 'secondIrPath'>,
  occurrence?: CompileOccurrenceLocator,
): CompileWarning =>
  orderCompileWarnings([
    withCompileWarningOccurrence(createDuplicateWarning({ ...info, overwroteForkBaseline: false }), occurrence),
  ])[0];

type OrderedCompileWarning = InputCompileWarning & {
  [compileWarningOccurrence]?: CompileOccurrenceLocator;
};

/** 按 transform 失败来源选择 warning code */
export const transformWarnCode = (failed: IRTransform | undefined): InputCompileWarning['code'] => {
  switch (failed?.kind) {
    case 'offset-translate':
      return BuiltinCompileWarningCode.OffsetBaseUnresolved;
    case 'at-translate':
      return BuiltinCompileWarningCode.AtTargetUnresolved;
    case 'polar-translate':
      return BuiltinCompileWarningCode.PolarOriginUnresolved;
    default:
      return BuiltinCompileWarningCode.UnresolvedNodeReference;
  }
};

/** 格式化重复 id warning */
export const createDuplicateWarning = (info: DuplicateRegisterInfo): InputCompileWarning => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const firstLoc = info.firstIrPath === undefined ? '(unknown earlier location)' : formatPropertyPath(info.firstIrPath);
  const secondLoc =
    info.secondIrPath === undefined ? '(unknown current location)' : formatPropertyPath(info.secondIrPath);

  return {
    code: BuiltinCompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: info.secondIrPath ?? [],
  };
};

/** 为内部 warning 绑定完整 occurrence，公开结构仍只保留 code/message/path */
export const withCompileWarningOccurrence = (
  warning: InputCompileWarning,
  occurrence: CompileOccurrenceLocator | undefined,
): InputCompileWarning => {
  if (occurrence === undefined || compileWarningOccurrence in warning) return warning;
  return replaceCompileWarningOccurrence(warning, occurrence);
};

/** 强制替换内部 warning occurrence，供 replay placement 重映射 */
export const replaceCompileWarningOccurrence = (
  warning: InputCompileWarning,
  occurrence: CompileOccurrenceLocator,
): InputCompileWarning => {
  const ordered: OrderedCompileWarning = { ...warning };
  Object.defineProperty(ordered, compileWarningOccurrence, { value: freezeOccurrence(occurrence) });
  return ordered;
};

/** 读取 warning 的完整 occurrence；root/global warning 回退到公开 locator */
export const compileWarningOccurrenceOf = (warning: InputCompileWarning): CompileOccurrenceLocator =>
  (warning as OrderedCompileWarning)[compileWarningOccurrence] ?? {
    sourcePath: warning.path,
    expansionPath: [],
  };

/** 按 canonical occurrence 排序 warning，稳定排序保留同 occurrence 的 emission 顺序 */
export const orderCompileWarnings = (warnings: ReadonlyArray<InputCompileWarning>): Array<CompileWarning> =>
  warnings
    .map(warning => {
      const ordered: CompileWarning = {
        code: warning.code,
        message: warning.message,
        path: warning.path,
        origin: warning.origin ?? { kind: 'primary' },
      };
      Object.defineProperty(ordered, compileWarningOccurrence, {
        value: freezeOccurrence(compileWarningOccurrenceOf(warning)),
      });
      return Object.freeze(ordered);
    })
    .sort((left, right) =>
      compareCompileOccurrences(compileWarningOccurrenceOf(left), compileWarningOccurrenceOf(right)),
    );
