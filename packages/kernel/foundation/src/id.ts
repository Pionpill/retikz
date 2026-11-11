/** 独立持有递增序号的 ID 分配器 */
export type IdAllocator = Readonly<{
  /** 用连字符连接前缀与从 0 开始的递增序号，不回收已分配编号 */
  next: () => string;
}>;

/**
 * 创建使用固定前缀的实例级 ID 分配器
 * @description 每个实例独立计数，不使用全局状态；需要跨实例唯一性时，由调用方提供互不重叠的前缀命名域
 * @param prefix ID 前缀，其后自动添加连字符；空前缀生成 -0、-1 等 ID
 * @returns 从序号 0 开始分配 ID 的独立实例
 * @remarks 分配器生命周期及已分配 ID 的保留由调用方负责
 */
export const createIdAllocator = (prefix: string): IdAllocator => {
  let nextId = 0;
  return Object.freeze({ next: () => `${prefix}-${nextId++}` });
};
