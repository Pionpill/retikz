/** 常规档固定预热十轮、正式测量一百轮；关闭按时间持续采样 */
export const sampling = {
  time: 0,
  iterations: 100,
  warmup: true,
  warmupTime: 0,
  warmupIterations: 10,
};

/** 大规模参考档只测三次，不预热；注册时还须显式指定 async: false */
export const referenceSampling = {
  time: 0,
  iterations: 3,
  warmup: false,
  warmupTime: 0,
  warmupIterations: 0,
};
