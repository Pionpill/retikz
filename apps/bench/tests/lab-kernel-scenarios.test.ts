import { describe, expect, it } from 'vitest';

import {
  defaultKernelLabScenarioId,
  getKernelLabScenario,
  kernelLabPolicies,
  kernelLabScenarios,
} from '../src/playground/kernel-scenarios';

describe('Kernel Performance Lab 场景目录', () => {
  it('固定提供三个可比较的运行策略', () => {
    expect(kernelLabPolicies.map(policy => policy.id)).toEqual(['static-full', 'retained-full', 'retained-auto']);
  });

  it('以单实体更新作为默认场景并保持稳定 identity', () => {
    expect(defaultKernelLabScenarioId).toBe('single-entity-update');
    expect(kernelLabScenarios.map(scenario => scenario.id)).toEqual(['single-entity-update']);
    expect(getKernelLabScenario(defaultKernelLabScenarioId).changedEntities).toBe(1);
  });

  it('拒绝未知场景', () => {
    expect(() => getKernelLabScenario('missing')).toThrow(/unknown Kernel Lab scenario/i);
  });
});
