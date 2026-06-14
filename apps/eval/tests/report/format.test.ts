import { describe, expect, it } from 'vitest';
import { type Report, aggregate } from '../../src/report/aggregate';
import { formatMarkdown } from '../../src/report/format';
import { type RunRecord } from '../../src/run';

const records: Array<RunRecord> = [
  { promptId: 'c1', category: 'core', difficulty: 'single', model: 'anthropic:claude-opus-4-8', kIndex: 0, zodOk: true, compileOk: true, l2: null },
  { promptId: 'c2', category: 'core', difficulty: 'complex', model: 'anthropic:claude-opus-4-8', kIndex: 0, zodOk: false, compileOk: false, failure: { stage: 'zod', reason: 'bad version' }, l2: null },
];

describe('formatMarkdown', () => {
  it('含标题、总览百分比与分组表', () => {
    const md = formatMarkdown(aggregate(records), { generatedAt: '2026-06-13T00:00:00Z' });
    expect(md).toContain('# retikz eval ·');
    expect(md).toContain('2026-06-13T00:00:00Z');
    expect(md).toContain('50.0%'); // overall zod pass rate
    expect(md).toContain('anthropic:claude-opus-4-8');
    expect(md).toContain('| single |');
    expect(md).toContain('| complex |');
  });

  it('失败明细列出 promptId/model/stage/reason', () => {
    const md = formatMarkdown(aggregate(records), { generatedAt: '2026-06-13T00:00:00Z' });
    expect(md).toContain('失败明细');
    expect(md).toContain('c2');
    expect(md).toContain('zod');
    expect(md).toContain('bad version');
  });

  it('无失败时不渲染明细段', () => {
    const ok: Array<RunRecord> = [
      { promptId: 'c1', category: 'core', difficulty: 'single', model: 'm', kIndex: 0, zodOk: true, compileOk: true, l2: null },
    ];
    const md = formatMarkdown(aggregate(ok), { generatedAt: 't' });
    expect(md).not.toContain('失败明细');
  });
});

describe('formatMarkdown L2', () => {
  const base: Report = {
    total: 1,
    overall: { count: 1, zodPassRate: 1, compilePassRate: 1 },
    byModel: {},
    byDifficulty: {},
    failuresByStage: { llm: 0, extract: 0, zod: 0, compile: 0 },
    failures: [],
    l2: {
      reached: 2,
      skipped: 1,
      candidatePassRate: 0.5,
      assertionPassRate: 0.75,
      assertionsTotal: 4,
      assertionsPassed: 3,
      byKind: { textPresent: { passed: 2, total: 2 }, primitiveCount: { passed: 1, total: 2 } },
    },
    assertionFailures: [
      { promptId: 'p2', model: 'm', kIndex: 0, kind: 'primitiveCount', actual: 'rect=0' },
    ],
  };

  it('含 L2 段、断言级通过率与断言失败明细', () => {
    const md = formatMarkdown(base, { generatedAt: '2026-06-14' });
    expect(md).toContain('L2 语义断言');
    expect(md).toContain('75.0%'); // 断言级
    expect(md).toContain('primitiveCount');
    expect(md).toContain('rect=0');
  });

  it('reached=0 时省略 L2 段', () => {
    const md = formatMarkdown(
      { ...base, l2: { ...base.l2, reached: 0 }, assertionFailures: [] },
      { generatedAt: 'x' },
    );
    expect(md).not.toContain('L2 语义断言');
  });
});
