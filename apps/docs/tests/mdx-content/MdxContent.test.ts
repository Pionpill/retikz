import { describe, expect, it } from 'vitest';

import { compileMdx } from '@/modules/docs/components/mdx-content/compile';

describe('MDX 数学公式编译', () => {
  it('复用相同源码的编译任务，源码修改后生成新内容', async () => {
    const first = compileMdx('缓存原文');
    expect(compileMdx('缓存原文')).toBe(first);
    expect(await first).toContain('缓存原文');
    expect(compileMdx('缓存原文')).toBe(first);
    expect(await compileMdx('缓存修改后')).toContain('缓存修改后');
  });

  it('失败不会留在缓存中，修正源码后可编译', async () => {
    const failed = compileMdx('<Unclosed');
    await expect(failed).rejects.toBeDefined();
    const retry = compileMdx('<Unclosed');
    expect(retry).not.toBe(failed);
    await expect(retry).rejects.toBeDefined();
    expect(await compileMdx('修正后的正文')).toContain('修正后的正文');
  });

  it('将 display TeX 公式编译为 SVG 数学标记', async () => {
    const compiled = await compileMdx(`$$
\\begin{aligned}
x' &= ax + cy + e \\\\
y' &= bx + dy + f
\\end{aligned}
$$`);

    expect(compiled).toContain('svg');
  });

  it('保留 code span 中的美元符号', async () => {
    const compiled = await compileMdx('使用 `$$x$$` 表示字面量');

    expect(compiled).toContain('$$x$$');
    expect(compiled).not.toContain('svg');
  });
});
