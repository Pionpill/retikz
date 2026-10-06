import type { IRStack } from './schema';

/** 保留作者稀疏字段与栈底到栈顶顺序 */
export const createStack = (input: IRStack): IRStack => ({ ...input });
