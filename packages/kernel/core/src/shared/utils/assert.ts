/** 断言字符串必须包含至少一个非空白字符 */
export const assertNonEmptyString = (value: string, owner: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`${owner} must be a non-empty string.`);
  }
};
