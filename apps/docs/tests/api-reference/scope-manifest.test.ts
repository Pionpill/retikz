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
    expect(source).toContain("ScopeStyleProps['style']");
    expect(source).toContain("ScopeStyleProps['defaults']");
    expect(source).toContain("InputScope['style']");
    expect(source).toContain("InputScope['defaults']");
    expect(source).toContain(
      "`style?` | `InputScope['style']` | — | Scope-level visual overrides cascade declared fields to descendant Composites",
    );
    expect(source).toContain(
      "`defaults?` | `InputScope['defaults']` | — | Default styles for descendant Nodes, Paths, Labels, and Arrows; explicit element values win and `reset` blocks selected outer channels",
    );
    expect(source).toContain(
      'Local transform list following SVG transform-list order; the last item acts on a local point first',
    );
    expect(source).toContain(
      '`id?` | `string` | — | Optional Scope reference id; makes the group envelope available as a reference target<br />External paths and positions can reference these bounds',
    );
    expect(source).not.toContain('**id**: External paths and positions');
    for (const row of source.matchAll(/^\| `(?:readonly )?[^`]+` \| (.+) \|/gm)) {
      expect(row[1]?.length).toBeLessThanOrEqual(300);
    }
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  });
});
