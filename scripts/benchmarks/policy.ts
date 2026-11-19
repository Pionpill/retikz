import type { BenchmarkAllocationPolicy } from './types';

/** 统一粗粒度观察线，只提示可靠的高分配估计，不代表业务预算或泄漏判定 */
export const allocationPolicy: BenchmarkAllocationPolicy = {
  warningBytesPerOp: 16 * 1024 ** 2,
  rationale: '单次操作分配超过16MiB时提示关注重复调用的GC压力；仅为粗粒度观察线，不是算法内存预算或泄漏判定',
};
