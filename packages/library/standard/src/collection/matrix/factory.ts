import type { IRMatrix } from './schema';

/**
 * 保留稀疏 Source 的类型化工厂
 * @param input 完整的 Matrix Source，包含 namespace、type 及 items、data 或 skeleton
 * @returns 输入的浅拷贝；不校验、不补默认值，嵌套对象与输入共享引用
 */
export const createMatrix = (input: IRMatrix): IRMatrix => ({ ...input });
