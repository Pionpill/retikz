import { describe, expect, it } from 'vitest';
import { type CurrentPage, composeSystem } from '@/layout/ai-chat/context';

/**
 * system prompt 与 alpha.6 同步（ADR-03 + ADR-01）
 * @description lean 模式不触网（fetchLlmsTxt 之前返回）。校验组件列举主推 Layout、
 *   IR `to` 速查为对象形态、不再出现 `[x, y] | string`。
 */
describe('composeSystem — Layout 主推 + 对象 target', () => {
  it('zh: 组件列举含 Layout，不再宣传 `<TikZ>` 别名（beta.1 已删）', async () => {
    const s = await composeSystem('lean', null); // page=null → lang 'zh'
    expect(s).toContain('Layout');
    // `<TikZ>` alias 已移除，system prompt 不再把它列为可用组件 / 别名
    expect(s).not.toContain('别名');
  });

  it('zh: IR to 速查为对象形态、不含旧 `[x, y] | string`', async () => {
    const s = await composeSystem('lean', null);
    expect(s).toContain('{ id, anchor?, offset? }');
    expect(s).not.toContain('[x, y] | string');
  });

  it('en: 同样 Layout + 对象 to', async () => {
    const enPage: CurrentPage = { title: 't', mdx: '', lang: 'en', rawUrl: '', path: '/x' };
    const s = await composeSystem('lean', enPage);
    expect(s).toContain('Layout');
    expect(s).toContain('{ id, anchor?, offset? }');
    expect(s).not.toContain('[x, y] | string');
  });
});
