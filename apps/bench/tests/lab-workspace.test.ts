import { describe, expect, it } from 'vitest';

import type { LabRunSession } from '../src/playground/modules/core';

import { createInitialLabState, reduceLabState } from '../src/playground/workspace/lab-state';
import { detailedConfigControls, quickConfigControls } from '../src/playground/workspace/workspace-config';
import { benchModules, getModuleTestSuites } from '../src/playground/workspace/workspace-model';

const session: LabRunSession = {
  id: 'run-1',
  mode: 'inspect',
  scenarioId: 'single-entity-update',
  backend: 'svg',
  startedAt: 1,
  results: [],
};

describe('Bench workspace', () => {
  it('仅允许选择已有真实测试集的 Core 模块', () => {
    expect(benchModules.map(module => ({ id: module.id, available: module.available }))).toEqual([
      { id: 'core', available: true },
      { id: 'plot', available: false },
      { id: 'table', available: false },
    ]);
    expect(getModuleTestSuites('core').map(suite => suite.scenarioId)).toEqual(['single-entity-update']);
    expect(getModuleTestSuites('plot')).toEqual([]);
  });

  it('成功运行后自动打开报告面板', () => {
    const next = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    expect(next.reportOpen).toBe(true);
    expect(next.session).toBe(session);
  });

  it('关闭报告不会清除最近一次结果', () => {
    const completed = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    const closed = reduceLabState(completed, { type: 'report-closed' });
    expect(closed.reportOpen).toBe(false);
    expect(closed.session).toBe(session);
  });

  it('详细配置 Sheet 与报告面板独立开关', () => {
    const detailsOpen = reduceLabState(createInitialLabState(), { type: 'details-opened' });
    expect(detailsOpen.detailsOpen).toBe(true);
    expect(detailsOpen.reportOpen).toBe(false);
  });

  it('Header 只保留高频配置，采样与环境进入详细配置', () => {
    expect(quickConfigControls.map(control => control.id)).toEqual(['mode', 'backend', 'policy']);
    expect(detailedConfigControls.map(control => control.id)).toEqual(['sampleRuns', 'warmupRuns', 'environment']);
  });

  it('详细配置可以修改预热次数', () => {
    const next = reduceLabState(createInitialLabState(), { type: 'warmup-runs-selected', warmupRuns: 4 });
    expect(next.warmupRuns).toBe(4);
  });
});
