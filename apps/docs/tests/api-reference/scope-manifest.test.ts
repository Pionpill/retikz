import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createScopeApiReferenceMdx } from '../../scripts/api-reference/scope';

describe('Scope API 公开范围', () => {
  it('展开交叉类型与继承字段，保留共享契约并排除无关组件', async () => {
    const source = await createScopeApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    expect(headings).toEqual([
      'Scope / ScopeProps',
      'ScopeStyleProps',
      'scope / InputScope',
      'IRScope',
      'IRScopeDefaults',
      'IRScopeFrame',
      'IRScopePlacement',
      'IRScopeProps',
    ]);
    for (const owner of ['react', 'vanilla', 'core']) expect(source).toContain('## `@retikz/' + owner + '`');
    const input = source.split('### scope / InputScope\n')[1]?.split('\n### ')[0] ?? '';
    expect(input).toContain('`config` (Parameter)');
    expect(input).toContain('`children` (Parameter)');
    expect(input).toContain('| Returns |');
    expect(input).not.toContain('####');
    const frame = source.split('### IRScopeFrame\n')[1]?.split('\n### ')[0] ?? '';
    expect(frame).toContain('Uniform decoration spacing');
    expect(frame).toContain('`padding?` | `number` | `0`');
    expect(source).toContain('<ApiValues name="ScopeBoundingShape" />');
    expect(source).toContain('export declare const Scope: FC<ScopeProps>;');
    expect(source).toContain('`placement?`');
    expect(source).toContain("IRScope['placement']");
    expect(source).toContain('HydrationEventProps');
    expect(source).toContain('`authoring?`');
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
    for (const row of source.matchAll(/^\| `(?:readonly )?[^`]+` \| (`[^`]+`(?:<br \/>`[^`]+`)*) \|/gm)) {
      const typeText = row[1]?.replaceAll('\\|', '|').replaceAll('`', '');
      expect(typeText.length).toBeLessThanOrEqual(300);
    }
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  }, 30_000);
});
