import { arch, cpus, hostname, platform, totalmem } from 'node:os';

import type { TimingRunnerEnvironment } from './timing';

/** 校验并冻结绑定 wall-clock baseline 的机器与 runner identity */
export const captureTimingRunnerEnvironment = (environment: TimingRunnerEnvironment): TimingRunnerEnvironment => {
  const capturedCpuModels = environment.cpuModels.map(model => model.trim());
  if (capturedCpuModels.length === 0 || capturedCpuModels.some(model => model.length === 0)) {
    throw new Error('bench runner CPU model is unavailable');
  }
  const cpuModels = [...new Set(capturedCpuModels)].sort((left, right) => left.localeCompare(right, 'en'));
  if (!Number.isSafeInteger(environment.logicalCpuCount) || environment.logicalCpuCount <= 0) {
    throw new Error('bench runner logical CPU count is unavailable');
  }
  if (!Number.isSafeInteger(environment.totalMemoryBytes) || environment.totalMemoryBytes <= 0) {
    throw new Error('bench runner total memory is unavailable');
  }
  return Object.freeze({ ...environment, cpuModels: Object.freeze(cpuModels) });
};

/** 读取绑定 wall-clock baseline 的稳定机器与 runner identity */
export const readTimingRunnerEnvironment = (): TimingRunnerEnvironment => {
  const configuredRunnerId = process.env.RETIKZ_BENCH_RUNNER_ID?.trim();
  const processors = cpus();
  return captureTimingRunnerEnvironment({
    runnerId: configuredRunnerId === undefined || configuredRunnerId.length === 0 ? hostname() : configuredRunnerId,
    platform: platform(),
    architecture: arch(),
    cpuModels: processors.map(processor => processor.model),
    logicalCpuCount: processors.length,
    totalMemoryBytes: totalmem(),
  });
};
