/** 各模块共用的默认采样预算，时间单位为毫秒；不代表性能验收上限 */
export const sampling = {
  time: 300,
  iterations: 32,
  warmupTime: 100,
  warmupIterations: 16,
};
