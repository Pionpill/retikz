import { assertNonEmptyString as assertFoundationNonEmptyString } from '@retikz/foundation';

/** 校验 Table 的字符串输入并保留领域错误文本 */
export const assertTableNonEmptyString = (value: string, message: string): void => {
  try {
    assertFoundationNonEmptyString(value, 'Table value');
  } catch {
    throw new Error(message);
  }
};
