import { describe, expect, it } from 'vitest';

import { LabLifecycleAvailability, LabOutcome, LabPolicyId } from '../src/playground/modules/kernel';
import { createLabPolicyResult } from '../src/playground/modules/kernel/browser';

describe('browser Kernel Lab 结果映射', () => {
  it('从公共 trace 与 timing 生成 retained-auto 增量结果', () => {
    const result = createLabPolicyResult({
      policyId: LabPolicyId.RetainedAuto,
      samples: [1, 2, 4],
      trace: [
        {
          owner: '@retikz/core',
          phase: 'update',
          unit: 'ir-child',
          outcome: LabOutcome.Incremental,
          visited: 5_000,
          reused: 4_999,
          changed: 1,
        },
      ],
      patchKinds: ['update'],
      diagnostics: [],
    });

    expect(result.outcome).toBe(LabOutcome.Incremental);
    expect(result.work).toEqual({ visited: 5_000, reused: 4_999, changed: 1, reuseRatio: 0.9998 });
    expect(result.timing).toEqual({ samples: 3, medianMs: 2, p95Ms: 4, maxMs: 4 });
    expect(result.patch).toEqual({ operationCount: 1, kinds: ['update'] });
    expect(result.lifecycle).toEqual({ availability: LabLifecycleAvailability.Unavailable });
  });

  it('保留 retained fallback 结果，不把降级路径误报为增量', () => {
    const result = createLabPolicyResult({
      policyId: LabPolicyId.RetainedAuto,
      samples: [1],
      trace: [
        {
          owner: '@retikz/core',
          phase: 'update',
          unit: 'ir-child',
          outcome: LabOutcome.Fallback,
          visited: 5_000,
          reused: 0,
          changed: 5_000,
        },
      ],
      patchKinds: [],
      diagnostics: [],
    });

    expect(result.outcome).toBe(LabOutcome.Fallback);
  });
});
