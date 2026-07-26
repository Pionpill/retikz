import { describe, expect, it } from 'vitest';

import { runCoreWallClockReport } from '../src/report';

describe('wall-clock report scenarios', () => {
  it('在 Node 中报告 Core 的三个固定规模', () => {
    const reports = runCoreWallClockReport(0, 1);

    expect(reports.map(report => report.id)).toEqual(['core-full-100', 'core-full-1000', 'core-full-5000']);
    expect(reports.every(report => report.samples === 1 && report.durationMs.max >= 0)).toBe(true);
  });
});
