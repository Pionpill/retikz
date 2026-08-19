import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';
import { NonBlankStringSchema, PositiveNumberSchema } from './schema';

/** 拒绝空串和全空白字符串 */
export const assertNonEmptyString = (value: string, label: string): void => {
  if (!NonBlankStringSchema.safeParse(value).success) {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.NonEmptyStringRequired,
      message: `${label} must be a non-empty string.`,
      details: { label, value },
      cause: value,
    });
  }
};

/** 拒绝不是严格大于零的有限数值 */
export const assertPositiveNumber = (value: number, label: string): void => {
  if (!PositiveNumberSchema.safeParse(value).success) {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.PositiveNumberRequired,
      message: `${label} must be a positive finite number.`,
      details: { label, value },
      cause: value,
    });
  }
};
