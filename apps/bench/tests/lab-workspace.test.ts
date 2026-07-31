import { describe, expect, it } from 'vitest';

import type { LabRunSession } from '../src/playground/modules/core';

import { benchModules, defaultBenchModule } from '../src/playground/workspace/constant';
import { createInitialLabState, reduceLabState } from '../src/playground/workspace/lab-state';
import {
  BenchCaseView,
  getBenchCasePath,
  getBenchTestCase,
  getModuleTestGroups,
} from '../src/playground/workspace/test-catalog';
import { detailedConfigControls, quickConfigControls } from '../src/playground/workspace/workspace-config';
import { getModuleTestSuites } from '../src/playground/workspace/workspace-model';

const session: LabRunSession = {
  id: 'run-1',
  mode: 'inspect',
  scenarioId: 'single-entity-update',
  backend: 'svg',
  startedAt: 1,
  results: [],
};

describe('Bench workspace', () => {
  it('仅允许选择已有真实测试集的 Kernel 模块', () => {
    expect(
      benchModules.map(({ id, path, title, description, available }) => ({
        id,
        path,
        title,
        description,
        available,
      })),
    ).toEqual([
      {
        id: 'kernel',
        path: '/kernel',
        title: 'module.kernel',
        description: 'module.kernelDescription',
        available: true,
      },
      {
        id: 'plot',
        path: '/plot',
        title: 'module.plot',
        description: 'module.plotDescription',
        available: false,
      },
      {
        id: 'table',
        path: '/table',
        title: 'module.table',
        description: 'module.tableDescription',
        available: false,
      },
    ]);
    expect(defaultBenchModule.id).toBe('kernel');
    expect(new Set(benchModules.map(module => module.icon)).size).toBe(3);
    expect(getModuleTestSuites('kernel').map(suite => suite.scenarioId)).toEqual(['single-entity-update']);
    expect(getModuleTestSuites('plot')).toEqual([]);
  });

  it('按分组、方向和用例组织 Kernel 测试目录', () => {
    const groups = getModuleTestGroups('kernel');

    expect(groups.map(group => group.id)).toEqual(['performance', 'llm']);
    expect(groups.flatMap(group => group.directions.map(direction => direction.id))).toEqual([
      'full-performance',
      'incremental-performance',
      'interaction-performance',
      'generation-accuracy',
      'incremental-generation',
    ]);
    expect(
      groups.flatMap(group => group.directions.flatMap(direction => direction.cases.map(testCase => testCase.id))),
    ).toEqual(['single-entity-update']);
  });

  it('用稳定模块和用例标识生成页面路径', () => {
    expect(getBenchTestCase('kernel', 'single-entity-update')?.scenarioId).toBe('single-entity-update');
    expect(getBenchTestCase('plot', 'single-entity-update')).toBeUndefined();
    expect(getBenchCasePath('kernel', 'single-entity-update', BenchCaseView.Reports)).toBe(
      '/kernel/cases/single-entity-update/reports',
    );
  });

  it('成功运行后保留供报告页面读取的会话', () => {
    const next = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    expect(next.status).toBe('success');
    expect(next.session).toBe(session);
    expect('reportOpen' in next).toBe(false);
  });

  it('详细配置 Sheet 独立管理开关', () => {
    const detailsOpen = reduceLabState(createInitialLabState(), { type: 'details-opened' });
    expect(detailsOpen.detailsOpen).toBe(true);
    expect('reportOpen' in detailsOpen).toBe(false);
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
