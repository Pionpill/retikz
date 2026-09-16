import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createScopeApiReferenceMdx } from '../../scripts/api-reference/scope';

describe('Scope API 公开范围', () => {
  it('展开交叉类型与继承字段，保留共享契约并排除无关组件', async () => {
    const source = await createScopeApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    expect(headings).toEqual(['ScopeProps', 'ScopeStyleProps', 'Scope']);
    expect(source).toContain('`placement?`');
    expect(source).toContain("IRScope['placement']");
    expect(source).toContain('HydrationEventProps');
    expect(source).toContain('`authoring?`');
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  });
});
