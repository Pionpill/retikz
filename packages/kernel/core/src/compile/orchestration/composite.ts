import type { CompositeDefinition } from '../../contract';
import type { IRChild, IRScene } from '../../schemas';
import type { CompileWarning } from '../warning';

import { CompileWarningCode } from '../constants';

/** composite 嵌套展开最大深度。 */
export const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

type LowerOptions = {
  onWarn: (warning: CompileWarning) => void;
  /**
   * composite 嵌套展开最大深度。
   * @default DEFAULT_MAX_COMPOSITE_DEPTH (32)
   */
  maxDepth?: number;
};

/** 把 composite 节点展开为 Tier 1 IR；未注册节点 warning 后跳过。 */
export const lowerComposites = (
  ir: IRScene,
  registry: ReadonlyMap<string, CompositeDefinition>,
  options: LowerOptions,
): IRScene => {
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
      // 展开产物可能仍含 tier2，继续展开。
      return expandList(list, depth + 1, path);
    }
    if (child.type === 'scope') {
      return [{ ...child, children: expandList(child.children, depth, `${path}.children`) }];
    }
    return [child];
  };

  return { ...ir, children: expandList(ir.children, 0, 'children') };
};
