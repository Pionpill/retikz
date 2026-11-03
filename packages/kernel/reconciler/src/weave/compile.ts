/** 当前阶段的名称读取与作者节点依赖 */
export type WeaveCompileRead = Readonly<{
  /** 查询名称 */
  name: string;
  /** 查询结果 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中声明对应的稳定作者节点 */
  binding?: object;
}>;
