import type { IRChain } from './schema';

/** 保留稀疏 Source 的链工厂 */
export const createChain = (input: IRChain): IRChain => ({ ...input });
