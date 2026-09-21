import type { IRList } from './schemas';

/** 保留稀疏 Source 的类型化工厂 */
export const createList = (input: IRList): IRList => ({ ...input });
