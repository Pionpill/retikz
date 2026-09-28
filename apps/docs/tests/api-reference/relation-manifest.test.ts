import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { relationApiConfigs } from '../../scripts/api-reference/relation';
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

describe('Relation API public reference', () => {
  it('preserves paired entries, route alternatives, semantic recipes, and complete English output', async () => {
    const sections: Array<string> = [];
    for (const config of relationApiConfigs) sections.push(await createApiReferenceMdx(config, 'en'));
    const source = sections.join('\n\n');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    for (const name of [
      'Relation / RelationProps',
      'relation / RelationInputEmbedProps',
      'normalizeRelation / InputRelation',
      'createRelation / RelationCreateOptions',
      'InputRelationRoute',
      'InputRelationWay',
      'IRGraphRelation',
      'IRGraphRelationRoleTokenRecipe',
      'defineRelationPredicate',
      'defineRelationKind',
      'RelationKindDefinition',
    ])
      expect(headings).toContain(name);
    expect(headings.some(name => name.endsWith('Schema'))).toBe(false);
    expect(headings).not.toContain('RelationKind');
    expect(headings).not.toContain('RelationKindValue');
    expect(source).not.toContain('<ApiValues name="RelationKind" />');
    expect(source).toContain('(input: InputRelation) => IRGraphRelation');
    expect(source).toContain('`Array<IRGraphRelationRouteStep>`');
    expect(source).toContain('The route variant excludes way');
    expect(source).toContain('The way variant excludes route');
    expect(source).toContain('this function does not register or validate it');
    expect(source).toContain('<ApiValues name="RelationDirection" />');
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  }, 60_000);
});
