import { describe, expect, it } from 'vitest';

import { BenchModuleId } from '../src/playground/workspace/constant';
import { createInitialLabState, reduceLabState } from '../src/playground/workspace/lab-state';

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
});
