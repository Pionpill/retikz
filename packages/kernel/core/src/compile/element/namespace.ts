import type { CompileOccurrenceLocator } from '../../contract';
import { createDuplicateWarning, orderCompileWarnings, withCompileWarningOccurrence } from '../orchestration';
import type { CompileWarning } from '../warning';
import type { CompileBinding, CompileNamespace } from './types';

/** 一个调用方持有的名称 frame；更新仅作用于所属编译版本 */
export type CompileNamespaceRegistry = {
  /** 供元素读取的命名空间视图 */
  namespace: CompileNamespace;
  /** 按声明顺序登记名称，保留 Core 同 frame last-wins 诊断 */
  register: (name: string, binding: CompileBinding, path: string, occurrence: CompileOccurrenceLocator) => void;
  /** 更新同一绑定的结果，不重放名称注册或覆盖后来同名声明 */
  replace: (binding: object, value: CompileBinding) => void;
};

/** 创建版本内名称 frame，不预先登记尚不可见的声明 */
export const createCompileNamespaceRegistry = (
  parent?: CompileNamespace,
  onWarning?: (warning: CompileWarning) => void,
): CompileNamespaceRegistry => {
  const bindings = new Map<string, CompileBinding>();
  const paths = new Map<string, string>();
  let depth = 0;
  for (let outer = parent; outer !== undefined; outer = outer.parent) depth++;
  return {
    namespace: { bindings, ...(parent === undefined ? {} : { parent }) },
    register: (name, binding, path, occurrence) => {
      if (bindings.has(name)) {
        const warnings = orderCompileWarnings([
          withCompileWarningOccurrence(
            createDuplicateWarning({
              id: name,
              frameDepth: depth,
              firstIrPath: paths.get(name),
              secondIrPath: path,
              overwroteForkBaseline: false,
            }),
            occurrence,
          ),
        ]);
        warnings.forEach(warning => onWarning?.(warning));
      } else paths.set(name, path);
      bindings.set(name, binding);
    },
    replace: (binding, value) => {
      for (const [name, previous] of bindings) {
        if (previous.binding === binding) bindings.set(name, value);
      }
    },
  };
};
