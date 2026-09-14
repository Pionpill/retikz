import { describe, expect, it } from 'vitest';

import { compileMdx } from '@/modules/docs/components/mdx-content/compile';

describe('MDX 数学公式编译', () => {
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
