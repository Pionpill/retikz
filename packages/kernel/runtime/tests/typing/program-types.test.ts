import { describe, expect, it } from 'vitest';

import { RuntimeProgramExecution, RuntimeProgramKind, RuntimeProgramPhase } from '../../src/program';

describe('runtime program types', () => {
  it('公开 Program phase、kind 与 execution 常量及取值类型', () => {
    expect(RuntimeProgramPhase).toEqual({ Initial: 'initial', Update: 'update' });
    expect(RuntimeProgramKind).toEqual({
      Full: 'full',
      Incremental: 'incremental',
      Bailout: 'bailout',
      Fallback: 'fallback',
    });
    expect(RuntimeProgramExecution).toEqual({ Full: 'full', Incremental: 'incremental', Fallback: 'fallback' });
  });
});
