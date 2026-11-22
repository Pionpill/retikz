import { boolean, strictObject } from 'zod';

/** 当前分组引用的完整裁剪路径 */
export const ClipInspectOptionsSchema = strictObject({
  outline: boolean()
    .default(true)
    .describe('Outline of the clip referenced by the group, including implicit closing edges.'),
});
