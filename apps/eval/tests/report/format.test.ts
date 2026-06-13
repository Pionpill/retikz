import { describe, expect, it } from 'vitest';
import { aggregate } from '../../src/report/aggregate';
import { formatMarkdown } from '../../src/report/format';
import { type RunRecord } from '../../src/run';

const records: Array<RunRecord> = [
  { promptId: 'c1', category: 'core', difficulty: 'single', model: 'anthropic:claude-opus-4-8', kIndex: 0, zodOk: true, compileOk: true },
  { promptId: 'c2', category: 'core', difficulty: 'complex', model: 'anthropic:claude-opus-4-8', kIndex: 0, zodOk: false, compileOk: false, failure: { stage: 'zod', reason: 'bad version' } },
];

describe('formatMarkdown', () => {
  it('含标题、总览百分比与分组表', () => {
    const md = formatMarkdown(aggregate(records), { generatedAt: '2026-06-13T00:00:00Z' });
    expect(md).toContain('# retikz eval · L1');
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
      { promptId: 'c1', category: 'core', difficulty: 'single', model: 'm', kIndex: 0, zodOk: true, compileOk: true },
    ];
    const md = formatMarkdown(aggregate(ok), { generatedAt: 't' });
    expect(md).not.toContain('失败明细');
  });
});
