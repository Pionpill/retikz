import { NonBlankStringSchema, NonNegativeIntegerSchema } from '@retikz/foundation';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../shared/errors';

/**
 * 返回 List 直属格子的零基下标 id，不检查该位置是否存在
 * @param listId 非空白 List id
 * @param index 直属单元格的非负整数下标
 * @throws 参数非法时抛出 RetikzStandardError
 */
export const getListCellId = (listId: string, index: number): string => {
  if (!NonBlankStringSchema.safeParse(listId).success || !NonNegativeIntegerSchema.safeParse(index).success) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'List cell identity requires a nonblank list id and a nonnegative integer index.',
      details: { listId, index },
    });
  }
  return `${listId}-${index}`;
};
