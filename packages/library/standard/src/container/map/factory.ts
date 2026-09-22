import type { IRMap } from './schema';
/** 保留稀疏 Source 的类型化工厂 */
export const createMap = (input: IRMap): IRMap => ({ ...input });
