import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { entityApiConfigs } from '../../scripts/api-reference/entity';
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

describe('Entity API 公开参考', () => {
  it('生成独立参考并保留实例化组件参数，不泄漏泛型声明占位符', async () => {
    const sections: Array<string> = [];
    for (const config of entityApiConfigs) sections.push(await createApiReferenceMdx(config, 'en'));
    const source = sections.join('\n\n');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    for (const name of [
      'Entity / EntityProps',
      'entity / EntityInputEmbedProps',
      'normalizeEntity / InputEntity',
      'createEntity / EntityCreateOptions',
      'defineEntityRole',
      'defineEntityKind',
      'defineEntityPredicate',
    ])
      expect(headings).toContain(name);
    expect(headings).not.toContain('EntitySchema');
    expect(headings).not.toContain('EntityRoleSchema');
    const section = (name: string): string => source.split(`### ${name}\n`)[1]?.split(/\n##?# /)[0] ?? '';
    const props = section('Entity / EntityProps');
    expect(props).toContain('label="Direct members"');
    expect(props).toContain('`readonly children?`');
    expect(props).toContain('inherited from `InputEntity`');
    expect(props).not.toContain('`role`');
    expect(props).toContain('props: EntityProps');
    expect(props).not.toContain('props: P,');
    const input = section('normalizeEntity / InputEntity');
    expect(input).toContain('| Group |');
    expect(input).toContain('<ApiValues name="EntityRole" /> \\| `string`');
    expect(input).toContain('<ApiValues name="GraphStatus" />');
    expect(input).toContain('`Array<IRAnimationTrack>`');
    expect(input).toContain('Open Entity role key resolved by the configured Graph role registry.');
    expect(input).not.toContain('| — | — |');
    const factory = section('createEntity / EntityCreateOptions');
    expect(factory).toContain('(input: EntityCreateOptions) => IRGraphEntity');
    expect(factory).toContain('does not parse the schema, generate an id');
    expect(source).toContain('(options?: GraphDefinitionOptions) => Array<AnyCompositeDefinition>');
    expect(source).not.toContain('GraphDefinitionOptions = {}');
    expect(section('createGraphProviders')).toContain('`GraphDefinitionOptions`');
    const predicate = section('defineEntityPredicate');
    expect(predicate.match(/<ApiTable/g)).toHaveLength(1);
    expect(predicate).toContain('Type parameters');
    expect(predicate).toContain('JSON object schema type constraining paramsSchema');
    expect(predicate).toContain('does not register or validate it');
    expect(predicate).toContain('The original definition object, without copying or modifying it');
    expect(source).not.toContain('#### Parameters');
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  }, 60_000);
});
