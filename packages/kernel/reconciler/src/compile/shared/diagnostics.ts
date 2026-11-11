import type { CompileOccurrenceLocator, CompileWarning } from '@retikz/core';
import { BuiltinCompileWarningCode, compareCompileOccurrences } from '@retikz/core';
import { formatPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileNamespaceKey } from '../provenance';
import { freezeOccurrence } from './artifact';

/** 同一 namespace frame 内重复 id 的诊断载荷 */
export type DuplicateRegisterInfo = {
  /** 同 frame 内重复出现的 id */
  id: string;
  /** 当前 frame 在栈中的深度（0 = 根 frame；每层 pushFrame 自增 1） */
  frameDepth: number;
  /** 当前 frame 的身份，用于隔离同深度的不同命名空间 */
  namespace: CompileNamespaceKey;
  /** 按注册顺序排列的全部声明位置，包含首次声明 */
  duplicateIrPaths: ReadonlyArray<PropertyPath>;
};

/** 执行器内部来源标记，不进入公开绘图诊断契约 */
const compileWarningOccurrence = Symbol('compileWarningOccurrence');

/** 内部诊断分组身份，不进入枚举或 JSON 输出 */
const duplicateWarningContext = Symbol('duplicateWarningContext');

/** 保留分组信息的内部重名诊断 */
type DuplicateCompileWarning = CompileWarning & {
  [compileWarningOccurrence]?: CompileOccurrenceLocator;
  [duplicateWarningContext]?: Pick<DuplicateRegisterInfo, 'namespace' | 'id'>;
};

/** 格式化重复 id warning */
export const createDuplicateWarning = (info: DuplicateRegisterInfo): CompileWarning => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const locations = info.duplicateIrPaths.map(path => formatPropertyPath(path));
  const warning: CompileWarning = {
    code: BuiltinCompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); defined at ${locations.join(', ')}. The later definition overrides the earlier one (last-wins).`,
    path: info.duplicateIrPaths.at(-1)!,
  };
  Object.defineProperty(warning, duplicateWarningContext, { value: { namespace: info.namespace, id: info.id } });
  return warning;
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
  const ordered: DuplicateCompileWarning = { ...warning };
  const duplicate = (warning as DuplicateCompileWarning)[duplicateWarningContext];
  if (duplicate !== undefined) Object.defineProperty(ordered, duplicateWarningContext, { value: duplicate });
  Object.defineProperty(ordered, compileWarningOccurrence, { value: freezeOccurrence(occurrence) });
  return ordered;
};

/** 读取 warning 的完整 occurrence；root/global warning 回退到公开 locator */
export const compileWarningOccurrenceOf = (warning: CompileWarning): CompileOccurrenceLocator =>
  (warning as DuplicateCompileWarning)[compileWarningOccurrence] ?? {
    sourcePath: warning.path,
    expansionPath: [],
  };

/** 同一命名空间和 id 只保留最终声明快照，再按来源稳定排序 */
export const orderCompileWarnings = (warnings: ReadonlyArray<CompileWarning>): Array<CompileWarning> => {
  /** 最后一次重名报告的输入序号，保留与其它诊断的相对顺序 */
  const grouped = new Map<CompileNamespaceKey, Map<string, number>>();
  warnings.forEach((warning, index) => {
    const duplicate = (warning as DuplicateCompileWarning)[duplicateWarningContext];
    if (duplicate === undefined) return;
    let names = grouped.get(duplicate.namespace);
    if (names === undefined) {
      names = new Map();
      grouped.set(duplicate.namespace, names);
    }
    names.set(duplicate.id, index);
  });
  return warnings
    .filter((warning, index) => {
      const duplicate = (warning as DuplicateCompileWarning)[duplicateWarningContext];
      return duplicate === undefined || grouped.get(duplicate.namespace)?.get(duplicate.id) === index;
    })
    .map(warning => Object.freeze(replaceCompileWarningOccurrence(warning, compileWarningOccurrenceOf(warning))))
    .sort((left, right) =>
      compareCompileOccurrences(compileWarningOccurrenceOf(left), compileWarningOccurrenceOf(right)),
    );
};

/** 把结构化编译 warning 格式化为统一的可读消息 */
export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${formatPropertyPath(warning.path)}: ${warning.message}`;
