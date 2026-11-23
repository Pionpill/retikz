import {
  CodeBlockPropsSchema,
  createBlockHeader,
  createCodeBlockContribution,
  defineCodeBlock,
  defineGraphTheme,
} from '@retikz/graph';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import { embed, SceneRuntime, normalizeScene, compileToScene } from '@retikz/vanilla';
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

import { createInputScene } from '@retikz/react';
import type { FC } from 'react';

const ServiceView: FC<typeof source> = () => null;

const Service = Object.assign(ServiceView, {
  displayName: 'Service',
  isTier2Embeddable: true,
  inputEmbedAdapter: adapter,
});

describe('自定义代码块 React 编写', () => {
  it('重复使用 Vanilla 适配器并匹配 Direct IR 和 Vanilla Scene', () => {
    const input = createInputScene(<Service key="service" {...source} />);
    const normalized = normalizeScene(input);

    expect(normalized.ir.children).toEqual([source]);

    const actual = compileToScene(input, {
      compile: { themeDefinitions: [coreStyle] },
    });
    const vanilla = compileToScene(
      { type: 'scene', children: [inputEmbed] },
      { compile: { themeDefinitions: [coreStyle] } },
    );
    const direct = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        compile: prepareProcessingInput({ type: 'scene', children: [inputEmbed] }, { themeDefinitions: [coreStyle] })
          .coreOptions,
      },
    );

    expect(actual.scene).toEqual(vanilla.scene);
    expect(actual.scene).toEqual(direct.scene);

    const retained = SceneRuntime.fromInput(input, {
      compile: { themeDefinitions: [coreStyle] },
    });

    expect(retained.read().compilation.result.scene).toEqual(actual.scene);

    retained.dispose();
  });
});
