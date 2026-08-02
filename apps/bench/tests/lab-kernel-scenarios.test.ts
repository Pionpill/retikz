import { describe, expect, it } from 'vitest';

import {
  defaultKernelLabScenarioId,
  getKernelLabScenario,
  kernelLabPolicies,
  kernelLabScenarios,
} from '../src/playground/modules/kernel';

describe('Kernel Performance Lab 场景目录', () => {
  it('固定提供三个可比较的运行策略', () => {
    expect(kernelLabPolicies.map(policy => policy.id)).toEqual(['static-full', 'retained-full', 'retained-auto']);
  });

  it('以目录首个用例作为默认场景并保持稳定 identity', () => {
    expect(defaultKernelLabScenarioId).toBe('dense-node-grid');
    expect(kernelLabScenarios.map(scenario => scenario.id)).toEqual([
      'dense-node-grid',
      'mixed-primitives',
      'complex-paths',
      'node-drag',
      'node-selection',
      'node-insert-remove',
    ]);
    expect(getKernelLabScenario(defaultKernelLabScenarioId).changedEntities).toBe(5_000);
  });

  it('区分全量变化与三种常见增量变化', () => {
    expect(kernelLabScenarios.map(scenario => scenario.changeKind)).toEqual([
      'all-style',
      'all-style',
      'all-style',
      'single-position',
      'single-style',
      'insert-remove',
    ]);
    expect(kernelLabScenarios.slice(0, 3).every(scenario => scenario.changedEntities === scenario.entityCount)).toBe(
      true,
    );
  });

  it('拒绝未知场景', () => {
    expect(() => getKernelLabScenario('missing')).toThrow(/unknown Kernel Lab scenario/i);
  });
});
