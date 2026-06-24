import type { Child, NodeConfig } from './types';

/**
 * 构造一个 node IR 子节点
 * @description `node(config)` 匿名；`node(id, config)` 具名（首参为字符串即 id）。单签名联合参数同时接受两种
 *   形态。纯构造 IRNode（`{ type:'node', id?, ...config }`）；字段不自列、必填项（如 position）由 core schema
 *   在 compile 期校验，故构造边界用一处断言收口（builder 故意宽松、缺字段不在此拦、交 compileToScene 报错）。
 */
export const node = (arg1?: string | NodeConfig, arg2?: NodeConfig): Child => {
  const named = typeof arg1 === 'string';
  const config = named ? arg2 : arg1;
  const base = named ? { type: 'node', id: arg1 } : { type: 'node' };
  return { ...base, ...config } as Child;
};
