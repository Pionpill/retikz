import { afterEach, describe, expect, it, vi } from 'vitest';

import type * as Shared from '../src/shared';

const mocks = vi.hoisted(() => ({
  readTimingRunnerEnvironment: vi.fn(() => {
    throw new Error('timing runner environment unavailable');
  }),
}));

vi.mock('../src/benchmark/browser-runner', () => ({
  runBrowserBenchmark: vi.fn(() =>
    Promise.resolve({
      deterministic: [],
      environment: {},
      wallClock: [],
    }),
  ),
}));
vi.mock('../src/shared', async importOriginal => ({
  ...(await importOriginal<typeof Shared>()),
  compareDeterministicResults: vi.fn(() => []),
  createBaselineCandidate: vi.fn(() => []),
  runCoreDeterministicBenchmarks: vi.fn(() => []),
  runCoreWallClockReport: vi.fn(() => []),
}));
vi.mock('../src/benchmark/runner-environment', () => ({
  readTimingRunnerEnvironment: mocks.readTimingRunnerEnvironment,
}));

describe('bench CLI', () => {
  const originalArgv = process.argv;

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('check 不采集 timing runner 硬件环境', async () => {
    process.argv = [originalArgv[0], originalArgv[1], 'check'];
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(import('../src/benchmark/cli')).resolves.toBeDefined();

    expect(mocks.readTimingRunnerEnvironment).not.toHaveBeenCalled();
  });
});
