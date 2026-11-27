/** 常规档固定预热十轮、正式测量一百轮；关闭按时间持续采样 */
export const sampling = {
  time: 0,
  iterations: 100,
  warmup: true,
  warmupTime: 0,
  warmupIterations: 10,
};

/** 万级实体的限次采样：总计十次，保留正式预算判定 */
export const largeWorkloadSampling = { ...sampling, warmup: false, warmupIterations: 0, iterations: 10 };

/** 大规模参考档只测三次，不预热；注册时还须显式指定 async: false */
export const referenceSampling = {
  time: 0,
  iterations: 3,
  warmup: false,
  warmupTime: 0,
  warmupIterations: 0,
};

/** 独立分配阶段协议；粗采样复用最后一次预热，不增加算法调用 */
export const allocationSampling = {
  warmupIterations: 10,
  iterations: 100,
  pilotInterval: 32_768,
  minimumInterval: 128,
  targetSamples: 4096,
  minimumSamples: 16,
};
