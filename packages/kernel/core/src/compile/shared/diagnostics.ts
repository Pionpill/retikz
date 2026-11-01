import { formatPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../../contract';
import { compareCompileOccurrences } from '../../contract';
import type { IRTransform } from '../../schemas';
import { freezeOccurrence } from './artifact';
import { BuiltinCompileWarningCode, compileWarningOccurrence } from './warning';
import type { CompileWarning } from './warning';

/** 同一命名空间内重名诊断所需的注册信息 */
type DuplicateCompileWarningContext = {
  /** 重复名称 */
  id: string;
  /** 命名空间深度 */
  frameDepth: number;
  /** 首次声明位置 */
  firstIrPath?: PropertyPath;
  /** 重复声明位置 */
  secondIrPath?: PropertyPath;
};

/** 为调用方维护的名称 frame 生成与全量编译一致的重名诊断 */
export const createDuplicateCompileWarning = (
  info: DuplicateCompileWarningContext,
  occurrence?: CompileOccurrenceLocator,
): CompileWarning => {
  const warning = createDuplicateWarning(info);
  return Object.freeze(replaceCompileWarningOccurrence(warning, occurrence ?? compileWarningOccurrenceOf(warning)));
};

/** 按 transform 失败来源选择 warning code */
export const transformWarnCode = (failed: IRTransform | undefined): CompileWarning['code'] => {
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
export const createDuplicateWarning = (info: DuplicateCompileWarningContext): CompileWarning => {
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
  warning: CompileWarning,
  occurrence: CompileOccurrenceLocator | undefined,
): CompileWarning => {
  if (occurrence === undefined || compileWarningOccurrence in warning) return warning;
  return replaceCompileWarningOccurrence(warning, occurrence);
};

/** 强制替换内部 warning occurrence，供 replay placement 重映射 */
export const replaceCompileWarningOccurrence = (
  warning: CompileWarning,
  occurrence: CompileOccurrenceLocator,
): CompileWarning => {
  const ordered: CompileWarning = { ...warning };
  Object.defineProperty(ordered, compileWarningOccurrence, { value: freezeOccurrence(occurrence) });
  return ordered;
};

/** 读取 warning 的完整 occurrence；root/global warning 回退到公开 locator */
export const compileWarningOccurrenceOf = (warning: CompileWarning): CompileOccurrenceLocator =>
  warning[compileWarningOccurrence] ?? {
    sourcePath: warning.path,
    expansionPath: [],
  };

/** 按 canonical occurrence 排序 warning，稳定排序保留同 occurrence 的 emission 顺序 */
export const orderCompileWarnings = (warnings: ReadonlyArray<CompileWarning>): Array<CompileWarning> =>
  warnings
    .map(warning => {
      const ordered: CompileWarning = {
        code: warning.code,
        message: warning.message,
        path: warning.path,
      };
      Object.defineProperty(ordered, compileWarningOccurrence, {
        value: freezeOccurrence(compileWarningOccurrenceOf(warning)),
      });
      return Object.freeze(ordered);
    })
    .sort((left, right) =>
      compareCompileOccurrences(compileWarningOccurrenceOf(left), compileWarningOccurrenceOf(right)),
    );
