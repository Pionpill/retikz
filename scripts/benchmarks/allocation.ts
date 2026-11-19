import type { HeapProfiler } from 'node:inspector';
import { Session } from 'node:inspector/promises';

import { allocationSampling } from './sampling';
import type { BenchmarkExecution } from './scenario';
import type { BenchmarkAllocation } from './types';

/** 与当前 V8 协议对齐；Node 声明未列出分配样本和节点身份 */
type AllocationProfileNode = HeapProfiler.SamplingHeapProfileNode & {
  id?: number;
  children: Array<AllocationProfileNode>;
};

/** inspector 返回的外部采样 profile，samples 为 V8 协议提供的分配记录 */
export type AllocationProfile = {
  head: AllocationProfileNode;
  samples?: Array<{ nodeId: number }>;
};

/** 为被测操作建立明确调用栈边界；输入构造、生命周期与断言不在此栈内 */
const runAllocationOperation = <T>(run: () => T): T => run();

/** 仅累计操作子树，拒绝将 profiler、fixture 或驱动的背景分配摊给算法 */
export const summarizeAllocationProfile = (
  profile: AllocationProfile,
): { estimatedTotalBytes: number; sampleCount: number } => {
  let estimatedTotalBytes = 0;
  const operationNodes = new Set<number>();
  const visit = (node: AllocationProfileNode, insideOperation = false): void => {
    const inside = insideOperation || node.callFrame.functionName === 'runAllocationOperation';
    if (inside) {
      estimatedTotalBytes += node.selfSize;
      if (node.id !== undefined) operationNodes.add(node.id);
    }
    for (const child of node.children) visit(child, inside);
  };
  visit(profile.head);
  return {
    estimatedTotalBytes,
    sampleCount: profile.samples?.filter(sample => operationNodes.has(sample.nodeId)).length ?? 0,
  };
};

/** profiler 故障与被测操作异常分开处理，不将算法失败伪装成“无法采样” */
const profileOperations = async (
  session: Session,
  samplingInterval: number,
  run: () => void,
): Promise<{ profile: AllocationProfile } | { reason: string }> => {
  const parameters = {
    samplingInterval,
    includeObjectsCollectedByMajorGC: true,
    includeObjectsCollectedByMinorGC: true,
  };
  try {
    await session.post('HeapProfiler.startSampling', parameters);
  } catch (error) {
    return { reason: `V8 分配采样不可用：${String(error)}` };
  }
  try {
    run();
  } catch (error) {
    await session.post('HeapProfiler.stopSampling').catch(() => {});
    throw error;
  }
  try {
    // 独立分配阶段结束后回收一次；包含已回收对象的选项保证统计不是仅剩存活结果
    await session.post('HeapProfiler.collectGarbage');
    return { profile: (await session.post('HeapProfiler.stopSampling')).profile };
  } catch (error) {
    return { reason: `V8 分配采样未完成：${String(error)}` };
  }
};

/** 独立执行固定轮次；最后一轮预热粗采样，用于选择正式间隔而非增加算法调用 */
export const measureAllocations = async <T>(execution: BenchmarkExecution<T>): Promise<BenchmarkAllocation> => {
  const observation = { calls: 0, warmupCalls: 0, samplingInterval: allocationSampling.minimumInterval };
  const session = new Session();
  try {
    session.connect();
  } catch (error) {
    return { ...observation, status: 'unavailable', sampleCount: 0, reason: `无法连接 V8 分配采样：${String(error)}` };
  }
  let result: T | undefined;
  // Proxy 的原生调用边界保留 apply 栈帧，避免短包装被 JIT 内联后失去分配归因标记
  const operation = new Proxy(execution.run, { apply: runAllocationOperation });
  const run = (warmup: boolean): void => {
    execution.beforeEach?.();
    if (warmup) observation.warmupCalls++;
    else observation.calls++;
    result = operation();
    execution.afterEach?.();
  };
  try {
    for (let index = 0; index < allocationSampling.warmupIterations - 1; index++) run(true);
    const pilot = await profileOperations(session, allocationSampling.pilotInterval, () => run(true));
    if ('reason' in pilot) return { ...observation, status: 'unavailable', sampleCount: 0, reason: pilot.reason };
    const pilotBytes = summarizeAllocationProfile(pilot.profile).estimatedTotalBytes;
    // 目标约4096个正式样本，按128B分档；避免大点集保留数百万条分配记录
    observation.samplingInterval = Math.max(
      allocationSampling.minimumInterval,
      Math.ceil(
        (pilotBytes * allocationSampling.iterations) /
          allocationSampling.targetSamples /
          allocationSampling.minimumInterval,
      ) * allocationSampling.minimumInterval,
    );
    const measured = await profileOperations(session, observation.samplingInterval, () => {
      for (let index = 0; index < allocationSampling.iterations; index++) run(false);
    });
    if ('reason' in measured) return { ...observation, status: 'unavailable', sampleCount: 0, reason: measured.reason };
    const statistics = summarizeAllocationProfile(measured.profile);
    // 运行结果只在停止采样后校验，不把断言内存算进被测操作
    execution.verify(result as T);
    return {
      ...observation,
      ...statistics,
      status: statistics.sampleCount >= allocationSampling.minimumSamples ? 'measured' : 'insufficient',
    };
  } finally {
    session.disconnect();
  }
};
