import { describe, expect, it } from 'vitest';

import { compareDeterministicResults } from '../src/budget';

describe('deterministic budget', () => {
  it('接受精确工作量、full 不变量与 oracle 一致的结果', () => {
    expect(
      compareDeterministicResults(
        [{ id: 'core-100', oracle: 'ok', visited: 100, reused: 0, changed: 100 }],
        [{ id: 'core-100', oracle: 'ok', visited: 100, changed: 100 }],
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
          { id: 'core-100', oracle: 'ok', visited: 100, changed: 100 },
          { id: 'missing', oracle: 'ok', visited: 1, changed: 1 },
        ],
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/core-100.*oracle/i), expect.stringMatching(/missing/i)]));
  });

  it('拒绝少报工作量以及 full 路径复用计数', () => {
    expect(
      compareDeterministicResults(
        [{ id: 'core-100', oracle: 'ok', visited: 99, reused: 1, changed: 98 }],
        [{ id: 'core-100', oracle: 'ok', visited: 100, changed: 100 }],
      ),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/visited/i), expect.stringMatching(/reused=0/i)]));
  });
});
