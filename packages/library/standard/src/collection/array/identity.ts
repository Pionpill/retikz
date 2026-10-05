import { NonBlankStringSchema, NonNegativeIntegerSchema } from '@retikz/foundation';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../shared/errors';

/**
 * 返回 Array 直属格子的零基下标 id，不检查该位置是否存在
 * @param arrayId 非空白 Array id
 * @param index 直属单元格的非负整数下标
 * @returns 由 arrayId、连字符与零基下标组成的单元格 id
 * @throws 参数非法时抛出 RetikzStandardError
 */
export const getArrayCellId = (arrayId: string, index: number): string => {
  if (!NonBlankStringSchema.safeParse(arrayId).success || !NonNegativeIntegerSchema.safeParse(index).success) {
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Array cell identity requires a nonblank array id and a nonnegative integer index.',
      details: { arrayId, index },
    });
  }
  return `${arrayId}-${index}`;
};
