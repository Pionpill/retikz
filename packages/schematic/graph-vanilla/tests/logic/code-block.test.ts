import {
  CodeBlockPropsSchema,
  createBlockHeader,
  createCodeBlockContribution,
  defineCodeBlock,
  defineGraphThemeStyle,
} from '@retikz/graph';
import type { InputEmbed, InputEmbedAdapter } from '@retikz/vanilla';
import { normalizeScene, prepareProcessingInput, processToStaticInputResult } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

const schema = CodeBlockPropsSchema.safeExtend({ namespace: literal('test'), type: literal('service') });
const definition = defineCodeBlock({
  namespace: 'test',
  type: 'service',
  schema,
  compose: (source, context) => [
    createBlockHeader({ title: { text: source.name, textColor: context.codeBlockTokens.accentColor } }),
  ],
});
const style = defineGraphThemeStyle({
  name: 'custom',
  resolve: () => ({ codeBlockTokens: { accentColor: '#123456' } }),
});
const contribution = createCodeBlockContribution(definition, { graphThemeStyles: [style] });
const coreStyle = { name: 'custom', resolve: () => ({}) };
const source = schema.parse({
  namespace: 'test',
  type: 'service',
  id: 'service',
  name: 'Service',
  theme: { style: 'custom', mode: 'dark' },
});
const adapter: InputEmbedAdapter<typeof source> = {
  kind: 'test.service',
  lower: props => ({ node: { ...props }, providerDependencies: contribution }),
};
const embed: InputEmbed<typeof source> = { type: 'embed', kind: adapter.kind, id: 'authoring', props: source };

describe('Custom code block Vanilla authoring', () => {
  it('preserves Source and uses the same providers and local theme as Direct IR', () => {
    const input = { children: [embed] };
    const normalized = normalizeScene(input, { adapters: [adapter] });
    expect(normalized.ir.children).toEqual([source]);
    const actual = processToStaticInputResult(input, { adapters: [adapter], compile: { themeStyles: [coreStyle] } });
    const direct = processToStaticInputResult(
      { type: 'scene', version: 1, children: [source] },
      {
        compile: prepareProcessingInput(
          { children: [embed] },
          { adapters: [adapter], compile: { themeStyles: [coreStyle] } },
        ).coreOptions,
      },
    );
    expect(actual.scene).toEqual(direct.scene);
  });
});
