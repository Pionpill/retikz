import {
  CodeBlockPropsSchema,
  createBlockHeader,
  createCodeBlockContribution,
  defineCodeBlock,
  defineGraphTheme,
} from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import { embed, normalizeScene, compileToScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { prepareProcessingInput } from '../../../../kernel/vanilla/src/runtime/_input/prepare';

const schema = CodeBlockPropsSchema.safeExtend({ namespace: literal('test'), type: literal('service') });

const definition = defineCodeBlock({
  namespace: 'test',
  type: 'service',
  schema,
  compose: (source, context) => [
    createBlockHeader({ title: { text: source.name, textColor: context.codeBlockTokens.accentColor } }),
  ],
});

const style = defineGraphTheme({
  name: 'custom',
  resolve: () => ({ codeBlockTokens: { accentColor: '#123456' } }),
});

const contribution = createCodeBlockContribution(definition, { graphThemeDefinitions: [style] });

const coreStyle = { name: 'custom', resolve: () => ({}) };

const source = schema.parse({
  namespace: 'test',
  type: 'service',
  id: 'service',
  name: 'Service',
  theme: { name: 'custom', mode: 'dark' },
});

const adapter: InputEmbedAdapter<typeof source> = {
  kind: 'test.service',
  lower: props => ({ node: { ...props }, providerDependencies: contribution }),
};

const inputEmbed = embed({ adapter, id: 'authoring', props: source });

describe('自定义代码块 Vanilla 编写', () => {
  it('保留 Source 并使用与 Direct IR 相同的提供者和本地主题', () => {
    const input = { type: 'scene' as const, children: [inputEmbed] };
    const normalized = normalizeScene(input);

    expect(normalized.ir.children).toEqual([source]);

    const actual = compileToScene(input, {
      compile: { themeDefinitions: [coreStyle] },
    });
    const direct = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        compile: prepareProcessingInput(
          { type: 'scene', children: [inputEmbed] },
          { compile: { themeDefinitions: [coreStyle] } },
        ).coreOptions,
      },
    );

    expect(actual.scene).toEqual(direct.scene);
  });
});
