import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureTimingRunnerEnvironment, readTimingRunnerEnvironment } from '../src/runner/runner-environment';

const validRunnerEnvironment = Object.freeze({
  runnerId: 'kernel-alpha2-runner',
  platform: 'win32',
  architecture: 'x64',
  cpuModels: Object.freeze(['Example CPU']),
  logicalCpuCount: 16,
  totalMemoryBytes: 64 * 1_024 ** 3,
});

afterEach(() => vi.unstubAllEnvs());

describe('timing runner environment', () => {
  it('采集平台、架构、CPU、内存与稳定 runner identity', () => {
    vi.stubEnv('RETIKZ_BENCH_RUNNER_ID', 'kernel-alpha2-runner');

    const environment = readTimingRunnerEnvironment();

    expect(environment).toEqual(
      expect.objectContaining({
        runnerId: 'kernel-alpha2-runner',
        platform: process.platform,
        architecture: process.arch,
        cpuModels: expect.arrayContaining([expect.any(String)]),
      }),
    );
    expect(environment.cpuModels.every(model => model.length > 0)).toBe(true);
    expect(Number.isSafeInteger(environment.logicalCpuCount)).toBe(true);
    expect(environment.logicalCpuCount).toBeGreaterThan(0);
    expect(Number.isSafeInteger(environment.totalMemoryBytes)).toBe(true);
    expect(environment.totalMemoryBytes).toBeGreaterThan(0);
  });

  it('空 runner id 回退到非空 hostname identity', () => {
    vi.stubEnv('RETIKZ_BENCH_RUNNER_ID', '   ');

    expect(readTimingRunnerEnvironment().runnerId.length).toBeGreaterThan(0);
  });

  it('拒绝空 CPU model 集合', () => {
    expect(() => captureTimingRunnerEnvironment({ ...validRunnerEnvironment, cpuModels: [] })).toThrow(
      'bench runner CPU model is unavailable',
    );
  });

  it.each([[['   ']], [['Example CPU', '   ']]])('拒绝包含空白值的 CPU model 集合 %j', cpuModels => {
    expect(() => captureTimingRunnerEnvironment({ ...validRunnerEnvironment, cpuModels })).toThrow(
      'bench runner CPU model is unavailable',
    );
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('拒绝非法逻辑处理器数量 %s', logicalCpuCount => {
    expect(() => captureTimingRunnerEnvironment({ ...validRunnerEnvironment, logicalCpuCount })).toThrow(
      'bench runner logical CPU count is unavailable',
    );
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('拒绝非法总内存字节数 %s', totalMemoryBytes => {
    expect(() => captureTimingRunnerEnvironment({ ...validRunnerEnvironment, totalMemoryBytes })).toThrow(
      'bench runner total memory is unavailable',
    );
  });
});
