import { describe, expect, it } from 'vitest';
import { buildPrompt } from '../../src/prompt/build';

const task = {
  id: 'core-single-01',
  category: 'core' as const,
  difficulty: 'single' as const,
  prompt: '画一个写着 Hello 的矩形节点。',
};

describe('buildPrompt', () => {
  it('包含任务文本与 schema 契约', () => {
    const out = buildPrompt(task, '{"type":"object"}');
    expect(out).toContain('画一个写着 Hello 的矩形节点。');
    expect(out).toContain('{"type":"object"}');
  });

  it('要求只输出 JSON、不带 markdown 围栏与解释', () => {
    const out = buildPrompt(task, '{}');
    expect(out.toLowerCase()).toContain('json');
    expect(out).toMatch(/只|only/i);
  });
});