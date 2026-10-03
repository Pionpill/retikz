import type { IRList } from './schema';

/**
 * 保留稀疏 Source 的类型化工厂
 * @param input 完整的 List Source，包含 namespace、type 及 items 或 data
 * @returns 输入的浅拷贝；不校验、不补默认值，嵌套对象与输入共享引用
 */
export const createList = (input: IRList): IRList => ({ ...input });
