import { describe, expect, it } from 'vitest';

import { RuntimeComputationExecution, RuntimeComputationKind, RuntimeComputationPhase } from '../../src/computation';

describe('运行时计算类型', () => {
  it('公开 Computation phase、kind 与 execution 常量及取值类型', () => {
    expect(RuntimeComputationPhase).toEqual({ Initial: 'initial', Update: 'update' });
    expect(RuntimeComputationKind).toEqual({
      Full: 'full',
      Incremental: 'incremental',
      Bailout: 'bailout',
      Fallback: 'fallback',
    });
    expect(RuntimeComputationExecution).toEqual({ Full: 'full', Incremental: 'incremental', Fallback: 'fallback' });
  });
});
