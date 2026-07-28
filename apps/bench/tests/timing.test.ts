import { describe, expect, it } from 'vitest';

import type { WallClockScenarioReport } from '../src/report';
import type { TimingBaseline } from '../src/timing';

import {
  assertTimingGatePassed,
  compareTimingReports,
  createTimingBaselineCandidate,
  createTimingEnvironmentFingerprint,
  runTimingGateAttempts,
} from '../src/timing';

const report = (id: string, median: number, p95 = median, max = p95): WallClockScenarioReport =>
  Object.freeze({ id, samples: 30, durationMs: Object.freeze({ median, p95, max }) });

const passingReports = Object.freeze([
  report('core-full-5000', 100),
  report('core-retained-full-5000', 100),
  report('core-single-entity-update-5000', 20),
  report('svg-retained-full-5000', 100),
  report('svg-single-entity-update-5000', 20),
  report('svg-group-update-5000', 40),
  report('svg-none-retained-full-5000', 100),
  report('svg-replace-fallback-5000', 100),
  report('canvas-retained-full-5000', 100),
  report('canvas-single-entity-update-5000', 20),
  report('canvas-group-update-5000', 40),
  report('canvas-none-retained-full-5000', 100),
  report('canvas-replace-fallback-5000', 100),
]);

const baseline: TimingBaseline = createTimingBaselineCandidate('fingerprint', passingReports);

describe('timing baseline gate', () => {
  it('baseline candidate 只收录 ADR-05 tracked 5000 场景', () => {
    const candidate = createTimingBaselineCandidate('fingerprint', [report('svg-full-100', 0), ...passingReports]);

    expect(candidate.scenarios.map(scenario => scenario.id)).toEqual([
      'canvas-group-update-5000',
      'canvas-none-retained-full-5000',
      'canvas-replace-fallback-5000',
      'canvas-retained-full-5000',
      'canvas-single-entity-update-5000',
      'core-retained-full-5000',
      'core-single-entity-update-5000',
      'svg-group-update-5000',
      'svg-none-retained-full-5000',
      'svg-replace-fallback-5000',
      'svg-retained-full-5000',
      'svg-single-entity-update-5000',
    ]);
  });

  it('fingerprint 覆盖采样参数、Playwright、Node 与实际 browser 环境', () => {
    const expected = { playwright: '1.62.0', warmupRuns: 5, sampleRuns: 30 };
    const browser = { browserVersion: '151.0.7922.34', viewport: { width: 1_440, height: 900 } };
    const fingerprint = createTimingEnvironmentFingerprint(expected, 'v24.18.0', browser);

    expect(createTimingEnvironmentFingerprint({ ...expected, sampleRuns: 1 }, 'v24.18.0', browser)).not.toBe(
      fingerprint,
    );
    expect(createTimingEnvironmentFingerprint(expected, 'v24.19.0', browser)).not.toBe(fingerprint);
    expect(createTimingEnvironmentFingerprint(expected, 'v24.18.0', { ...browser, browserVersion: 'other' })).not.toBe(
      fingerprint,
    );
  });

  it('candidate与compare拒绝重复tracked场景', () => {
    const duplicateReport = passingReports.find(candidate => candidate.id === 'svg-retained-full-5000');
    if (duplicateReport === undefined) throw new Error('expected tracked SVG full report');
    const duplicate = [...passingReports, duplicateReport];

    expect(() => createTimingBaselineCandidate('fingerprint', duplicate)).toThrow(/duplicate/i);
    expect(compareTimingReports('fingerprint', duplicate, baseline)).toMatchObject({ status: 'failed' });
    expect(
      compareTimingReports('fingerprint', passingReports, {
        ...baseline,
        scenarios: [...baseline.scenarios, baseline.scenarios[0]],
      }),
    ).toMatchObject({ status: 'failed' });
  });

  it('同 fingerprint 且绝对与相对护栏均满足时通过', () => {
    expect(compareTimingReports('fingerprint', passingReports, baseline)).toEqual({ status: 'passed', errors: [] });
  });

  it('不同 fingerprint 或缺 baseline 时明确跳过', () => {
    expect(compareTimingReports('other', passingReports, baseline).status).toBe('skipped');
    expect(compareTimingReports('fingerprint', passingReports, undefined).status).toBe('skipped');
  });

  it('compare模式只有明确passed可作为机器成功，skipped同样抛错', () => {
    expect(() => assertTimingGatePassed({ status: 'passed', errors: [] })).not.toThrow();
    for (const status of ['failed', 'unstable', 'skipped'] as const) {
      expect(() => assertTimingGatePassed({ status, errors: ['reason'] })).toThrow(
        new RegExp(`timing benchmark ${status}`, 'i'),
      );
    }
  });

  it('分别阻断 1.20 倍绝对护栏与各 backend 同口径 full 相对护栏', () => {
    const absoluteFailure = passingReports.map(candidate =>
      candidate.id === 'core-retained-full-5000' ? report(candidate.id, 121) : candidate,
    );

    expect(compareTimingReports('fingerprint', absoluteFailure, baseline)).toMatchObject({ status: 'failed' });
    for (const [id, p95] of [
      ['core-single-entity-update-5000', 51],
      ['svg-single-entity-update-5000', 26],
      ['canvas-single-entity-update-5000', 151],
      ['svg-group-update-5000', 51],
      ['canvas-group-update-5000', 126],
      ['svg-replace-fallback-5000', 201],
      ['canvas-replace-fallback-5000', 251],
    ] as const) {
      const relativeFailure = passingReports.map(candidate =>
        candidate.id === id ? report(candidate.id, p95) : candidate,
      );
      const selfBaseline = createTimingBaselineCandidate('fingerprint', relativeFailure);
      expect(compareTimingReports('fingerprint', relativeFailure, selfBaseline)).toMatchObject({ status: 'failed' });
    }
  });

  it('max 超过 2 倍时标记 unstable，交给 CLI 完整重跑', () => {
    const unstable = passingReports.map(candidate =>
      candidate.id === 'canvas-retained-full-5000' ? report(candidate.id, 100, 100, 201) : candidate,
    );

    expect(compareTimingReports('fingerprint', unstable, baseline).status).toBe('unstable');
  });

  it('unstable 只完整重跑一次，并拒绝重跑 fingerprint 漂移形成 PASS', async () => {
    const unstableReports = passingReports.map(candidate =>
      candidate.id === 'canvas-retained-full-5000' ? report(candidate.id, 100, 100, 201) : candidate,
    );
    let reruns = 0;
    const passAfterRerun = await runTimingGateAttempts(
      { fingerprint: 'fingerprint', reports: unstableReports },
      baseline,
      () => {
        reruns += 1;
        return Promise.resolve({ fingerprint: 'fingerprint', reports: passingReports });
      },
    );
    expect(reruns).toBe(1);
    expect(passAfterRerun.finalComparison.status).toBe('passed');

    const stillUnstable = await runTimingGateAttempts(
      { fingerprint: 'fingerprint', reports: unstableReports },
      baseline,
      () => Promise.resolve({ fingerprint: 'fingerprint', reports: unstableReports }),
    );
    expect(stillUnstable.finalComparison.status).toBe('unstable');

    const drifted = await runTimingGateAttempts(
      { fingerprint: 'fingerprint', reports: unstableReports },
      baseline,
      () => Promise.resolve({ fingerprint: 'other', reports: passingReports }),
    );
    expect(drifted.finalComparison).toEqual({
      status: 'skipped',
      errors: ['timing rerun fingerprint mismatch'],
    });

    reruns = 0;
    const noRerun = await runTimingGateAttempts(
      { fingerprint: 'fingerprint', reports: passingReports },
      baseline,
      () => {
        reruns += 1;
        return Promise.resolve({ fingerprint: 'fingerprint', reports: passingReports });
      },
    );
    expect(reruns).toBe(0);
    expect(noRerun.finalComparison.status).toBe('passed');
  });

  it('报告或 baseline 缺场景时失败', () => {
    const incompleteReports = passingReports.filter(candidate => candidate.id !== 'core-retained-full-5000');
    expect(compareTimingReports('fingerprint', incompleteReports, baseline)).toMatchObject({ status: 'failed' });
    const incompleteBaseline = createTimingBaselineCandidate('fingerprint', incompleteReports);
    expect(compareTimingReports('fingerprint', passingReports, incompleteBaseline)).toMatchObject({ status: 'failed' });
  });
});
