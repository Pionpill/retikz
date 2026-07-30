import { describe, expect, it, vi } from 'vitest';

import type { LabPolicyResult } from '../src/playground/model';

import {
  LabBackend,
  LabLifecycleAvailability,
  LabOutcome,
  LabPolicyId,
  LabResultSource,
  LabRunMode,
} from '../src/playground/model';
import { runKernelLab } from '../src/playground/run-kernel-lab';

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
  it('Inspect 只执行当前策略', async () => {
    const execute = vi.fn(input => Promise.resolve(createResult(input.policyId)));
    const session = await runKernelLab(
      {
        mode: LabRunMode.Inspect,
        scenarioId: 'single-entity-update',
        backend: LabBackend.Svg,
        policyId: LabPolicyId.RetainedAuto,
        warmupRuns: 0,
        sampleRuns: 1,
      },
      execute,
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ policyId: 'retained-auto', sampleRuns: 1 }));
    expect(session.results.map(result => result.policyId)).toEqual(['retained-auto']);
  });

  it.each([LabRunMode.Compare, LabRunMode.Measure])('%s 使用同一 fixture 依次执行三个策略', async mode => {
    const execute = vi.fn(input => Promise.resolve(createResult(input.policyId)));
    const session = await runKernelLab(
      {
        mode,
        scenarioId: 'single-entity-update',
        backend: LabBackend.Canvas,
        policyId: LabPolicyId.RetainedAuto,
        warmupRuns: 3,
        sampleRuns: 12,
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
        mode: LabRunMode.Inspect,
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
