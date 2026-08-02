import { describe, expect, it, vi } from 'vitest';

import type { LabPolicyResult } from '../src/playground/modules/kernel';

import {
  LabBackend,
  LabLifecycleAvailability,
  LabOutcome,
  LabPolicyId,
  LabResultSource,
  LabRunMode,
  runKernelLab,
} from '../src/playground/modules/kernel';

const createResult = (policyId: LabPolicyResult['policyId']): LabPolicyResult => ({
  policyId,
  outcome: policyId === LabPolicyId.RetainedAuto ? LabOutcome.Incremental : LabOutcome.Full,
  source: policyId === LabPolicyId.StaticFull ? LabResultSource.StaticView : LabResultSource.RuntimeTrace,
  work: {
    visited: 5_000,
    reused: policyId === LabPolicyId.RetainedAuto ? 4_999 : 0,
    changed: 1,
    reuseRatio: 0,
  },
  timing: { samples: 1, medianMs: 1, p95Ms: 1, maxMs: 1 },
  trace: [],
  diagnostics: [],
  lifecycle: { availability: LabLifecycleAvailability.Unavailable },
});

describe('Kernel Performance Lab runner', () => {
  it('Preview 只执行当前策略', async () => {
    const execute = vi.fn(input => Promise.resolve(createResult(input.policyId)));
    const previewHost = {} as HTMLElement;
    const session = await runKernelLab(
      {
        mode: LabRunMode.Preview,
        scenarioId: 'single-entity-update',
        backend: LabBackend.Svg,
        policyId: LabPolicyId.RetainedAuto,
        warmupRuns: 0,
        sampleRuns: 1,
        preview: { host: previewHost, width: 2560, height: 1440 },
      },
      execute,
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: 'retained-auto',
        sampleRuns: 1,
        preview: { host: previewHost, width: 2560, height: 1440 },
      }),
    );
    expect(session.results.map(result => result.policyId)).toEqual(['retained-auto']);
  });

  it('Benchmark 使用同一 fixture 依次执行三个策略', async () => {
    const execute = vi.fn(input => Promise.resolve(createResult(input.policyId)));
    const session = await runKernelLab(
      {
        mode: LabRunMode.Benchmark,
        scenarioId: 'single-entity-update',
        backend: LabBackend.Canvas,
        policyId: LabPolicyId.RetainedAuto,
        warmupRuns: 3,
        sampleRuns: 12,
        preview: { host: {} as HTMLElement, width: 640, height: 400 },
      },
      execute,
    );

    expect(execute.mock.calls.map(([input]) => input.policyId)).toEqual([
      'static-full',
      'retained-full',
      'retained-auto',
    ]);
    expect(session.results).toHaveLength(3);
    expect(session.results.every(result => result.timing.samples === 1)).toBe(true);
    expect(execute.mock.calls.every(([input]) => !('preview' in input))).toBe(true);
  });

  it('在执行策略前记录会话开始时间', async () => {
    let currentTime = 10;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    const execute = vi.fn(input => {
      currentTime = 99;
      return Promise.resolve(createResult(input.policyId));
    });

    const session = await runKernelLab(
      {
        mode: LabRunMode.Preview,
        scenarioId: 'single-entity-update',
        backend: LabBackend.Svg,
        policyId: LabPolicyId.RetainedAuto,
        warmupRuns: 0,
        sampleRuns: 1,
      },
      execute,
    );

    expect(session.startedAt).toBe(10);
    now.mockRestore();
  });
});
