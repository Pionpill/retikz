import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';

import { createNodeApiReferenceMdx } from '../../scripts/api-reference/node';
import { translateNodeApiReference } from '../../scripts/api-reference/node.en';

describe('Node API 公开范围', () => {
  it('JSDoc 换行差异不改变翻译结果', () => {
    const source =
      '与 `text` 二选一、`text` 优先；支持字符串内嵌 `\\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行。\n字符串里可写行内公式 `$...$`（inline）/ `$$...$$`（display），编译期在注入 `<Layout lowerTex>` 时解析；未注入则字面渲染';
    expect(translateNodeApiReference(source.replace(/\n/g, '\r\n'))).toBe(translateNodeApiReference(source));
  });
  it('从三个公开入口保留节点与连接面契约并生成完整英文 MDX', async () => {
    const source = await createNodeApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    for (const name of [
      'Node / NodeProps',
      'Text / TextProps',
      'Coordinate / CoordinateProps',
      'node / InputNode',
      'coordinate / InputCoordinate',
      'defineBoundary',
      'BoundaryDefinitionInput',
    ]) {
      expect(headings).toContain(name);
    }
    for (const name of ['Scope', 'Path', 'Layout', 'SceneSchema', 'NodeOwnerOutputSchema']) {
      expect(headings).not.toContain(name);
    }
    expect(source).toContain('IRNodeLayout');
    expect(source).toContain('export declare const Node: FC<NodeProps>');
    expect(source).toContain('<TParams extends JsonObject>');
    const inputNode = source.split('### node / InputNode\n')[1]?.split('\n### ')[0] ?? '';
    expect(inputNode).toContain('`InputPosition`');
    expect(inputNode).not.toContain("`IRNode['position']`");
    expect(inputNode).toContain('`Array<IRAnimationTrack>`');
    expect(inputNode).toContain('#### Returns');
    expect(inputNode).toContain("Omit<InputNode, 'type'>");
    expect(headings).not.toContain('NodeProps');
    const label = source.split('### InputNodeLabel\n')[1]?.split('\n### ')[0] ?? '';
    expect(label).toContain('label="Direct members"');
    expect(source).toContain('`resolveRect?`');
    expect(source).toContain('`outline?`');
    for (const name of ['defineShape', 'defineBoundary']) {
      const section = source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
      const members = section.split('<DocTab value="members" label="Members">')[1]?.split('</DocTab>')[0] ?? '';
      const definition =
        section.split('<DocTab value="definition" label="Type definition">')[1]?.split('</DocTab>')[0] ?? '';
      expect(members).toContain('#### Parameters');
      expect(members).toContain('#### Returns');
      expect(members).not.toContain('export declare');
      expect(definition).toContain(`export declare const ${name}`);
    }
    expect(source).not.toMatch(/[\u3400-\u9fff]/u);
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
    expect(() => translateNodeApiReference('未翻译的新字段说明')).toThrow('Missing Node API translation');
  }, 30_000);
});
