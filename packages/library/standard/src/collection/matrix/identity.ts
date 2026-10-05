import { NonBlankStringSchema, NonNegativeIntegerSchema } from '@retikz/foundation';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../shared/errors';

/**
 * 返回直属格子的零基行列 id，不检查位置是否存在
 * @param matrixId 非空白 Matrix id
 * @param row 非负安全整数行坐标
 * @param column 非负安全整数列坐标
 * @returns 由 Matrix id 和零基行列坐标组成的单元格 id
 * @throws 参数非法时抛出 RetikzStandardError
 */
export const getMatrixCellId = (matrixId: string, row: number, column: number): string => {
  if (
    !NonBlankStringSchema.safeParse(matrixId).success ||
    !NonNegativeIntegerSchema.safeParse(row).success ||
    !NonNegativeIntegerSchema.safeParse(column).success
  )
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.AuthoringInvalid,
      message: 'Matrix cell identity requires a nonblank id and nonnegative integer coordinates.',
      details: { matrixId, row, column },
    });
  return `${matrixId}-${row}-${column}`;
};
