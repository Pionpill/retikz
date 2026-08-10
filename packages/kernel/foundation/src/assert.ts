import { NonBlankStringSchema } from './schema';

/** 拒绝空串和全空白字符串 */
export const assertNonEmptyString = (value: string, label: string): void => {
  if (!NonBlankStringSchema.safeParse(value).success) {
    throw new Error(`${label} must be a non-empty string.`);
  }
};
