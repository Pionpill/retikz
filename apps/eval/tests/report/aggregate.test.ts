import { describe, expect, it } from 'vitest';
import { aggregate } from '../../src/report/aggregate';
import { type RunRecord } from '../../src/run';

const rec = (over: Partial<RunRecord>): RunRecord => ({
  promptId: 'c1',
  category: 'core',
  difficulty: 'single',
  model: 'm',
  kIndex: 0,
  zodOk: true,
  compileOk: true,
  l2: null,
  ...over,
});

describe('aggregate', () => {
  it('总览：两层通过率 = 通过数 / 总数', () => {
    const r = aggregate([
      rec({ zodOk: true, compileOk: true }),
      rec({ zodOk: true, compileOk: false, failure: { stage: 'compile', reason: 'x' } }),
      rec({ zodOk: false, compileOk: false, failure: { stage: 'zod', reason: 'y' } }),
      rec({ zodOk: false, compileOk: false, failure: { stage: 'extract', reason: 'z' } }),
    ]);
    expect(r.total).toBe(4);
    expect(r.overall.zodPassRate).toBeCloseTo(0.5);
    expect(r.overall.compilePassRate).toBeCloseTo(0.25);
  });

  it('按模型 / 难度分组各出两层通过率', () => {
    const r = aggregate([
      rec({ model: 'a', difficulty: 'single', zodOk: true, compileOk: true }),
      rec({ model: 'b', difficulty: 'complex', zodOk: false, compileOk: false }),
    ]);
    expect(r.byModel.a.zodPassRate).toBe(1);
    expect(r.byModel.b.zodPassRate).toBe(0);
    expect(r.byDifficulty.single.compilePassRate).toBe(1);
    expect(r.byDifficulty.complex.compilePassRate).toBe(0);
  });

  it('失败归因按 stage 计数（含 llm）', () => {
    const r = aggregate([
      rec({ zodOk: false, compileOk: false, failure: { stage: 'llm', reason: 'a' } }),
      rec({ zodOk: false, compileOk: false, failure: { stage: 'extract', reason: 'b' } }),
      rec({ zodOk: false, compileOk: false, failure: { stage: 'zod', reason: 'c' } }),
      rec({ zodOk: false, compileOk: false, failure: { stage: 'zod', reason: 'd' } }),
    ]);
    expect(r.failuresByStage.llm).toBe(1);
    expect(r.failuresByStage.extract).toBe(1);
    expect(r.failuresByStage.zod).toBe(2);
    expect(r.failuresByStage.compile).toBe(0);
  });

  it('failures 明细：每条失败带 promptId/model/kIndex/stage/reason；通过项不进', () => {
    const r = aggregate([
      rec({ zodOk: true, compileOk: true }),
      rec({ promptId: 'c2', model: 'b', kIndex: 1, zodOk: false, compileOk: false, failure: { stage: 'compile', reason: 'boom' } }),
    ]);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]).toEqual({ promptId: 'c2', model: 'b', kIndex: 1, stage: 'compile', reason: 'boom' });
  });

  it('L2：算候选级/断言级/按 kind 通过率 + 断言失败明细', () => {
    const r = aggregate([
      rec({
        l2: {
          total: 2,
          passed: 2,
          results: [
            { kind: 'textPresent', pass: true, actual: '' },
            { kind: 'primitiveCount', pass: true, actual: '' },
          ],
        },
      }),
      rec({
        promptId: 'c2',
        l2: {
          total: 2,
          passed: 1,
          results: [
            { kind: 'textPresent', pass: true, actual: '' },
            { kind: 'primitiveCount', pass: false, actual: 'rect=0' },
          ],
        },
      }),
      rec({ l2: null }),
    ]);
    expect(r.l2.reached).toBe(2);
    expect(r.l2.skipped).toBe(1);
    expect(r.l2.candidatePassRate).toBe(0.5); // 1/2 候选全过
    expect(r.l2.assertionPassRate).toBe(0.75); // 3/4 断言过
    expect(r.l2.byKind.primitiveCount).toEqual({ passed: 1, total: 2 });
    expect(r.assertionFailures).toHaveLength(1);
    expect(r.assertionFailures[0]?.actual).toBe('rect=0');
    expect(r.assertionFailures[0]?.promptId).toBe('c2');
  });
});