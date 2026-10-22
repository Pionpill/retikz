/** 真实输入大小；百万档仅观察，不作为稳定尾延迟 */
export const inputCounts = [1_000, 10_000, 100_000, 1_000_000];

/** 将规模格式化为报告中的输入单位 */
export const formatCount = (count: number): string =>
  count >= 10_000 ? `${count / 10_000}万` : count >= 1_000 ? `${count / 1_000}千` : String(count);

/** 记录预期失败，断言在计时之外进行；成功返回 undefined 会使错误断言失败 */
export const captureFailure = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
};
