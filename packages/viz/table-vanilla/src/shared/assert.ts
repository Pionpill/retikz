import { assertNonEmptyString as assertFoundationNonEmptyString } from '@retikz/foundation';

/** 校验 Table Vanilla 的字符串输入并保留 adapter 错误文本 */
export const assertTableVanillaNonEmptyString = (value: string, message: string): void => {
  try {
    assertFoundationNonEmptyString(value, 'Table Vanilla value');
  } catch {
    throw new Error(message);
  }
};
