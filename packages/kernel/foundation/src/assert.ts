import type { RetikzError } from './error';
import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';
import { NonBlankStringSchema, PositiveNumberSchema } from './schema';

/**
 * 拒绝空串和全空白字符串
 * @param value 待检查的字符串
 * @param label 错误消息中的字段名称
 * @param ownerError 校验失败时原样抛出的领域错误；默认使用 Foundation 错误
 * @throws 校验失败时抛出 ownerError 或 RetikzFoundationError
 */
export const assertNonEmptyString = (
  value: string,
  label: string,
  ownerError: RetikzError | undefined = undefined,
): void => {
  if (!NonBlankStringSchema.safeParse(value).success) {
    if (ownerError) throw ownerError;
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.NonEmptyStringRequired,
      message: `${label} must be a non-empty string.`,
      details: { label, value },
      cause: value,
    });
  }
};

/**
 * 拒绝非有限数值以及小于等于零的数值
 * @param value 待检查的数值
 * @param label 错误消息中的字段名称
 * @param ownerError 校验失败时原样抛出的领域错误；默认使用 Foundation 错误
 * @throws 校验失败时抛出 ownerError 或 RetikzFoundationError
 */
export const assertPositiveNumber = (
  value: number,
  label: string,
  ownerError: RetikzError | undefined = undefined,
): void => {
  if (!PositiveNumberSchema.safeParse(value).success) {
    if (ownerError) throw ownerError;
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.PositiveNumberRequired,
      message: `${label} must be a positive finite number.`,
      details: { label, value },
      cause: value,
    });
  }
};
