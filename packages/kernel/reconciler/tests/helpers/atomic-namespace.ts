import type { CompileOccurrenceLocator, CompileWarning } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import type { CompileNamespaceKey } from '@retikz/reconciler';

import { createDuplicateWarning, replaceCompileWarningOccurrence } from '../../src/compile/shared';
import type { WeaveBinding, WeaveNamespace } from './atomic-runtime';

/** 一个调用方持有的名称 frame；更新仅作用于所属编译版本 */
export type WeaveNamespaceRegistry = {
  /** 本 frame 的作用域身份，名称覆盖不改变身份 */
  identity: CompileNamespaceKey;
  /** 供元素读取的命名空间视图 */
  namespace: WeaveNamespace;
  /** 按声明顺序登记名称，保留 Core 同 frame last-wins 诊断 */
  register: (name: string, binding: WeaveBinding, path: PropertyPath, occurrence: CompileOccurrenceLocator) => void;
  /** 更新同一绑定的结果，不重放名称注册或覆盖后来同名声明 */
  replace: (binding: object, value: WeaveBinding) => void;
};

/** 创建版本内名称 frame，不预先登记尚不可见的声明 */
export const createWeaveNamespaceRegistry = (
  parent?: WeaveNamespace,
  onWarning?: (warning: CompileWarning) => void,
): WeaveNamespaceRegistry => {
  const bindings = new Map<string, WeaveBinding>();
  const paths = new Map<string, ReadonlyArray<PropertyPath>>();
  const identity = Object.freeze({}) as CompileNamespaceKey;
  let depth = 0;
  for (let outer = parent; outer !== undefined; outer = outer.parent) depth++;
  return {
    identity,
    namespace: { bindings, ...(parent === undefined ? {} : { parent }) },
    register: (name, binding, path, occurrence) => {
      const duplicateIrPaths = [...(paths.get(name) ?? []), path];
      paths.set(name, duplicateIrPaths);
      if (bindings.has(name)) {
        onWarning?.(
          replaceCompileWarningOccurrence(
            createDuplicateWarning({
              id: name,
              frameDepth: depth,
              namespace: identity,
              duplicateIrPaths,
            }),
            occurrence,
          ),
        );
      }
      bindings.set(name, binding);
    },
    replace: (binding, value) => {
      for (const [name, previous] of bindings) {
        if (previous.binding === binding) bindings.set(name, value);
      }
    },
  };
};
