import { z } from 'zod';
import type { CompositeDefinition } from '../composites';
import type { IR, IRChild } from '../ir';
import { CompileWarningCode } from './constant';
import type { CompileWarning } from './constant';

/** composite 嵌套展开的默认最大深度（防环 / 防失控递归）；可经 CompileOptions.maxCompositeDepth 覆盖 */
export const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

type LowerOptions = {
  onWarn: (warning: CompileWarning) => void;
  maxDepth?: number;
};

/**
 * 从注册项的 schema 提取 `namespace` / `type` 的 literal 值（建表 key）
 * @description schema 须是 extend `CompositeBaseSchema` 的 ZodObject，且 namespace / type 为 z.literal；
 *   否则注册期抛清晰错（不重复写 namespace / type 的代价是 schema 形态约束）。
 */
const extractKey = (schema: CompositeDefinition['schema']): { namespace: string; type: string } => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('Composite schema must be a ZodObject extending CompositeBaseSchema.');
  }
  const shape = schema.shape as Record<string, unknown>;
  const namespace = shape.namespace;
  const type = shape.type;
  if (!(namespace instanceof z.ZodLiteral) || !(type instanceof z.ZodLiteral)) {
    throw new Error('Composite schema must declare `namespace` and `type` as z.literal(...).');
  }
  return { namespace: String(namespace.value), type: String(type.value) };
};

/**
 * Tier 2 lowering：把 IR 里的 composite 节点据注册表展开成 Tier 1
 * @description compileToScene 第一步调用。DFS 遍历，`'namespace' in node` → tier2（据 `${namespace}.${type}`
 *   查表 → `schema.parse(node)` 精确校验 + 强类型 → `expand` → 递归展开产物 fixpoint），否则 tier1（scope 递归
 *   children）。未注册 → `onWarn(COMPOSITE_NOT_REGISTERED)` + 跳过该节点（不进 Scene），继续编译其余；
 *   环 / 超 `maxDepth` → throw（死循环防护）。无 tier2 节点时等价于原样返回。
 *
 *   **注册表策略差异（有意，非疏漏）**：composite 以 `Array<CompositeDefinition>` 注入，可能重复，故重名
 *   **throw**（结构上无法天然去重，撞名是调用方错误）；未注册走 **warn + skip**——composite 是高层节点，
 *   缺对应包时跳过它仍能渲染其余图元，优雅降级优于整图崩。相对地，shape / arrow / pattern 以 `Record` 注入
 *   （key 天然去重，无重名可言），同名覆盖内置走 **warn + last-wins**（覆盖是合法定制）；未注册名走 **throw**
 *   ——这些是"定位 / 布局类"基元，节点引用了不存在的 shape 根本无法布局，必须 fail-fast。两类策略按"数据结构
 *   + 语义分层"区分，不强行统一。
 */
export const lowerComposites = (
  ir: IR,
  composites: Array<CompositeDefinition>,
  options: LowerOptions,
): IR => {
  const { onWarn, maxDepth = DEFAULT_MAX_COMPOSITE_DEPTH } = options;
  const registry = new Map<string, CompositeDefinition>();
  for (const definition of composites) {
    const { namespace, type } = extractKey(definition.schema);
    const key = `${namespace}.${type}`;
    if (registry.has(key)) {
      throw new Error(`Duplicate composite registration: '${key}'`);
    }
    registry.set(key, definition);
  }

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
