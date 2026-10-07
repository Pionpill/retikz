import type { IRTree } from './schema';

/** 保留作者稀疏字段与有序递归结构 */
export const createTree = (input: IRTree): IRTree => ({ ...input });
