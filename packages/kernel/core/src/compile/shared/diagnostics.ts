import { formatPropertyPath } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../../contract';
import { compareCompileOccurrences } from '../../contract';
import type { CompileNamespaceKey } from '../provenance';
import { freezeOccurrence } from './artifact';
import { BuiltinCompileWarningCode, compileWarningOccurrence } from './warning';
import type { CompileWarning } from './warning';

/** 同一命名空间内重名诊断所需的注册信息 */
type DuplicateCompileWarningContext = {
  /** 重复名称 */
  id: string;
  /** 命名空间深度 */
  frameDepth: number;
  /** 声明所属命名空间的身份，同深度的独立 frame 不共享身份 */
  namespace: CompileNamespaceKey;
  /** 按声明顺序包含首次声明的完整位置快照，重名时至少有两项 */
  duplicateIrPaths: ReadonlyArray<PropertyPath>;
};

/** 内部诊断分组身份，不进入枚举或 JSON 输出 */
const duplicateWarningContext = Symbol('duplicateWarningContext');

/** 保留分组信息的内部重名诊断 */
type DuplicateCompileWarning = CompileWarning & {
  [duplicateWarningContext]?: Pick<DuplicateCompileWarningContext, 'namespace' | 'id'>;
};

/** 为调用方维护的名称 frame 生成与全量编译一致的重名诊断 */
export const createDuplicateCompileWarning = (
  info: DuplicateCompileWarningContext,
  occurrence?: CompileOccurrenceLocator,
): CompileWarning => {
  const warning = createDuplicateWarning(info);
  return Object.freeze(replaceCompileWarningOccurrence(warning, occurrence ?? compileWarningOccurrenceOf(warning)));
};

/** 格式化重复 id warning */
export const createDuplicateWarning = (info: DuplicateCompileWarningContext): CompileWarning => {
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
  warning[compileWarningOccurrence] ?? {
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
