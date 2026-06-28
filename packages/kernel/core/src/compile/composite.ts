import type { CompositeDefinition } from '../contract/composite';
import type { IR, IRChild } from '../schemas';
import type { CompileWarning } from './constant';

import { CompileWarningCode } from './constant';

/** composite 嵌套展开的默认最大深度（防环 / 防失控递归）；可经 CompileOptions.maxCompositeDepth 覆盖 */
export const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

type LowerOptions = {
  onWarn: (warning: CompileWarning) => void;
  maxDepth?: number;
};

/**
 * Tier 2 lowering：把 IR 里的 composite 节点据注册表展开成 Tier 1
 * @description compileToScene 第一步调用。DFS 遍历，`'namespace' in node` → tier2（据 `${namespace}.${type}`
 *   查表 → `schema.parse(node)` 精确校验 + 强类型 → `expand` → 递归展开产物 fixpoint），否则 tier1（scope 递归
 *   children）。未注册 → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过该节点（不进 Scene），继续编译其余；
 *   环 / 超 `maxDepth` → throw（死循环防护）。无 tier2 节点时等价于原样返回。
 *
 *   composite registry 已在 compile 入口按 `namespace.type` resolved 成 Map；这里只消费 resolved registry。
 *   未注册 composite 仍走 **warn + skip**，因为 composite 是高层节点，缺对应包时跳过它仍能渲染其余图元。
 */
export const lowerComposites = (ir: IR, registry: ReadonlyMap<string, CompositeDefinition>, options: LowerOptions): IR => {
  const { onWarn, maxDepth = DEFAULT_MAX_COMPOSITE_DEPTH } = options;

  const expandList = (children: Array<IRChild>, depth: number, path: string): Array<IRChild> =>
    children.flatMap((child, index) => expandChild(child, depth, `${path}[${index}]`));

  const expandChild = (child: IRChild, depth: number, path: string): Array<IRChild> => {
    if ('namespace' in child) {
      // tier2 composite 节点
      const key = `${child.namespace}.${child.type}`;
      const definition = registry.get(key);
      if (!definition) {
        onWarn({
          code: CompileWarningCode.CompositeNotRegistered,
          message: `No composite registered for '${key}'; the node is skipped.`,
          path,
        });
        return []; // 未注册 → 跳过该节点、继续编译其余（非硬失败）
      }
      if (depth >= maxDepth) {
        throw new Error(
          `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${maxDepth} levels at ${path} (cyclic or runaway expand?)`,
        );
      }
      const parsed = definition.schema.parse(child); // 精确校验 + 强类型（含 default 填充）
      const produced = definition.expand(parsed);
      const list = Array.isArray(produced) ? produced : [produced];
      // fixpoint：展开产物可能仍含 tier2，继续展开（depth + 1 用于环 / 深度守卫）
      return expandList(list, depth + 1, path);
    }
    if (child.type === 'scope') {
      return [{ ...child, children: expandList(child.children, depth, `${path}.children`) }];
    }
    return [child];
  };

  return { ...ir, children: expandList(ir.children, 0, 'children') };
};
