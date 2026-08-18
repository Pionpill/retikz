import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';
import { NonBlankStringSchema } from './schema';

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
