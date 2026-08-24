import type { infer as ZodInfer } from 'zod';

import type { AnchorPositionSchema } from './schema';

/**
 * Node 锚点对锚点定位
 * @description 当前 Node 完成自身布局后，整体平移，使 `selfAnchor` 与 `target` 解析出的全局点重合
 */
export type IRAnchorPosition = ZodInfer<typeof AnchorPositionSchema>;
