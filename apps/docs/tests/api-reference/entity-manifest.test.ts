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
      'Entity',
      'EntityProps',
      'entity',
      'InputEntity',
      'createEntity',
      'defineEntityRole',
      'defineEntityKind',
      'defineEntityPredicate',
      'EntitySchema',
      'EntityRoleSchema',
    ])
      expect(headings).toContain(name);
    const props = source.split('### EntityProps\n')[1]?.split('\n### ')[0] ?? '';
    expect(props).toContain('label="Members"');
    expect(props).toContain('`role`');
    expect(props).toContain('`readonly children?`');
    expect(props).not.toContain('`type`');
    expect(props).toContain('<ApiValues name="EntityRole" /> \\| `string`');
    expect(props).toContain('<ApiValues name="GraphStatus" />');
    expect(props).not.toContain('OpenString<ValueOf<');
    expect(source.match(/<ApiValues name="EntityRole" \/>/g)).toHaveLength(4);
    expect(props).toContain('`Array<IRAnimationTrack>`');
    expect(props).not.toContain("InputEntity['animations']");
    expect(source.match(/`Array<IRAnimationTrack>`/g)).toHaveLength(4);
    const component = source.split('### Entity\n')[1]?.split('\n## ')[0] ?? '';
    expect(component).toContain('props: EntityProps');
    expect(component).not.toContain('props: P,');
    const factory = source.split('### createEntity\n')[1]?.split('\n### ')[0] ?? '';
    expect(factory).toContain('(input: EntityCreateOptions) => IRGraphEntity');
    expect(factory.length).toBeLessThan(2000);
    expect(source).toContain('(options?: GraphDefinitionOptions) => Array<AnyCompositeDefinition>');
    expect(source).not.toContain('GraphDefinitionOptions = {}');
    expect(source).toContain('View full inferred signature');
    expect(source).toContain('/schematic/graph/entity/schema-reference');
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  }, 60_000);
});
