import { describe, expect, it } from 'vitest';

import { compareDeterministicResults, createBaselineCandidate } from '../src/budget';

describe('deterministic budget', () => {
  it('接受精确工作量与 oracle 一致的 full / incremental 结果', () => {
    expect(
      compareDeterministicResults(
        [{ id: 'core-100', oracle: 'ok', visited: 100, reused: 0, changed: 100 }],
        [{ id: 'core-100', oracle: 'ok', visited: 100, reused: 0, changed: 100 }],
      ),
    ).toEqual([]);
    expect(
      compareDeterministicResults(
        [{ id: 'core-update-100', oracle: 'ok', visited: 100, reused: 99, changed: 1 }],
        [{ id: 'core-update-100', oracle: 'ok', visited: 100, reused: 99, changed: 1 }],
      ),
    ).toEqual([]);
  });

  it('把工作量超限、oracle 不一致与缺失场景都作为阻断错误', () => {
    expect(
      compareDeterministicResults(
        [
          { id: 'core-100', oracle: 'wrong', visited: 101, reused: 0, changed: 101 },
          { id: 'extra', oracle: 'ok', visited: 1, reused: 0, changed: 1 },
        ],
        [
          { id: 'core-100', oracle: 'ok', visited: 100, reused: 0, changed: 100 },
          { id: 'missing', oracle: 'ok', visited: 1, reused: 0, changed: 1 },
        ],
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/core-100.*oracle/i), expect.stringMatching(/missing/i)]));
  });

  it('拒绝 visited/reused/changed 任一工作量不匹配', () => {
    expect(
      compareDeterministicResults(
        [{ id: 'core-100', oracle: 'ok', visited: 99, reused: 1, changed: 98 }],
        [{ id: 'core-100', oracle: 'ok', visited: 100, reused: 0, changed: 100 }],
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/visited/i),
        expect.stringMatching(/reused/i),
        expect.stringMatching(/changed/i),
      ]),
    );
  });

  it('精确冻结可选dispose live handle预算', () => {
    const result = { id: 'retained-full', oracle: 'ok', visited: 1, reused: 0, changed: 1, liveHandles: 0 };

    expect(compareDeterministicResults([result], [result])).toEqual([]);
    expect(compareDeterministicResults([{ ...result, liveHandles: 1 }], [result])).toEqual([
      expect.stringMatching(/liveHandles/i),
    ]);
    expect(compareDeterministicResults([result], [{ ...result, liveHandles: undefined }])).toEqual([
      expect.stringMatching(/liveHandles/i),
    ]);
  });

  it('逐字段冻结可选 execution metadata，并写入 baseline candidate', () => {
    const result = {
      id: 'svg-policy-retained-auto-5000',
      oracle: 'ok',
      visited: 5_000,
      reused: 4_999,
      changed: 1,
      execution: {
        mode: 'retained',
        updateStrategy: 'auto',
        outcome: 'incremental',
        source: 'runtime-trace',
      },
    } as const;

    expect(compareDeterministicResults([result], [result])).toEqual([]);
    expect(
      compareDeterministicResults([{ ...result, execution: { ...result.execution, outcome: 'full' } }], [result]),
    ).toEqual([expect.stringMatching(/execution/i)]);
    expect(createBaselineCandidate([result])).toEqual([result]);
  });
});
