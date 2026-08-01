import { describe, expect, it } from 'vitest';

import type { LabRunSession } from '../src/playground/modules/kernel';

import { createInitialLabState, reduceLabState } from '../src/playground/app/lab-state';
import { BenchModuleId } from '../src/playground/app/module-registry';

describe('Performance Lab state', () => {
  it('使用 Inspect 与 retained-auto 作为默认入口', () => {
    expect(createInitialLabState()).toMatchObject({
      mode: 'inspect',
      backend: 'svg',
      policyId: 'retained-auto',
      scenarioId: 'single-entity-update',
      status: 'idle',
    });
  });

  it('使用路由模块初始化工作台', () => {
    expect(createInitialLabState(BenchModuleId.Plot).moduleId).toBe('plot');
  });

  it('模式切换保留策略与场景选择', () => {
    const initial = createInitialLabState();
    const next = reduceLabState(initial, { type: 'mode-selected', mode: 'compare' });
    expect(next).toMatchObject({
      mode: 'compare',
      policyId: 'retained-auto',
      scenarioId: 'single-entity-update',
    });
  });

  it('运行失败时保留上一次结果并暴露错误', () => {
    const initial = { ...createInitialLabState(), session: { id: 'previous' } as never };
    const running = reduceLabState(initial, { type: 'run-started' });
    const failed = reduceLabState(running, { type: 'run-failed', error: 'boom' });
    expect(failed.status).toBe('error');
    expect(failed.error).toBe('boom');
    expect(failed.session).toBe(initial.session);
  });

  it('报告保存失败不会覆盖成功运行结果', () => {
    const session: LabRunSession = {
      id: 'run-1',
      mode: 'inspect',
      scenarioId: 'single-entity-update',
      backend: 'svg',
      startedAt: 1,
      results: [],
    };
    const succeeded = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    const warned = reduceLabState(succeeded, { type: 'report-save-failed', warning: 'disk full' });

    expect(warned.status).toBe('success');
    expect(warned.session).toBe(session);
    expect(warned.reportWarning).toBe('disk full');
    expect(reduceLabState(warned, { type: 'run-started' }).reportWarning).toBeUndefined();
  });
});
