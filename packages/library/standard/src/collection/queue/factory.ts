import type { IRQueue } from './schema';

/** 保留作者稀疏字段与队首到队尾顺序 */
export const createQueue = (input: IRQueue): IRQueue => ({ ...input });
