import { defineThemeStyle } from '@retikz/core';
import {
  CodeBlockPropsSchema,
  CodeLogicSchema,
  createBlockHeader,
  createBlockRow,
  createBlockSection,
  createCodeBlockContribution,
  defineCodeBlock,
  defineGraphThemeStyle,
} from '@retikz/graph';
import { Layout } from '@retikz/react';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';
import type { infer as ZodInfer } from 'zod';
import { literal } from 'zod';

import type { Lang } from '@/i18n';

import { codeBlockExtensionI18n } from './code-block-extension.i18n';

const ServiceSchema = CodeBlockPropsSchema.safeExtend({
  namespace: literal('example'),
  type: literal('serviceBlock'),
  logic: CodeLogicSchema,
});
type ServiceSource = ZodInfer<typeof ServiceSchema>;

const service = defineCodeBlock({
  namespace: 'example',
  type: 'serviceBlock',
  schema: ServiceSchema,
  compose: (source, { codeBlockTokens: tokens }) => [
    createBlockHeader({
      title: { text: source.name, textColor: tokens.textColor },
      description: { text: source.description ?? '', textColor: tokens.mutedTextColor },
      icon:
        source.icon === null
          ? undefined
          : (source.icon ?? { type: 'node', position: [0, 0], text: 'S', style: { textColor: tokens.accentColor } }),
      trail:
        source.trail === null
          ? undefined
          : (source.trail ?? {
              type: 'node',
              position: [0, 0],
              text: 'service',
              style: { textColor: tokens.mutedTextColor },
            }),
    }),
    createBlockSection({
      id: source.logic.id,
      title:
        source.logic.title === undefined ? undefined : { text: source.logic.title, textColor: tokens.mutedTextColor },
      background: tokens.sectionBackground,
      children: (source.logic.body.kind === 'text'
        ? [source.logic.body.text]
        : source.logic.body.steps.map((step, index) => `${index + 1}. ${step}`)
      ).map(text =>
        createBlockRow({ content: { text, textColor: tokens.textColor, font: { family: tokens.codeFontFamily } } }),
      ),
    }),
  ],
});

const coreStyle = defineThemeStyle({ name: 'service-example', resolve: () => ({}) });
const graphStyle = defineGraphThemeStyle({
  name: coreStyle.name,
  resolve: theme => ({
    defaults: { block: { background: { fill: theme.mode === 'dark' ? '#172033' : '#f8fafc' } } },
    codeBlockTokens: {
      textColor: theme.mode === 'dark' ? '#e2e8f0' : '#0f172a',
      accentColor: theme.colors.categorical[0],
      sectionBackground: { fill: theme.mode === 'dark' ? '#243047' : '#eaf0f8' },
    },
  }),
});
const contribution = createCodeBlockContribution(service, { graphThemeStyles: [graphStyle] });
const adapter: InputEmbedAdapter<ServiceSource> = {
  kind: 'example.serviceBlock',
  lower: source => ({ node: { ...source }, providerDependencies: contribution }),
};
const ServiceView: FC<ServiceSource> = () => null;
const ServiceBlock = Object.assign(ServiceView, {
  displayName: 'ServiceBlock',
  isTier2Embeddable: true,
  inputEmbedAdapter: adapter,
});

// This custom entity has no Docs Vanilla converter; keep the complete React source.
export const previewSource = { deriveIR: false };

/** Language used for the example content. */
export type CodeBlockExtensionProps = { lang?: Lang };

/** Compose the same entity under local light and dark themes. */
const Demo: FC<CodeBlockExtensionProps> = props => {
  const { lang } = props;
  const i18n = codeBlockExtensionI18n[lang ?? 'zh'];
  return (
    <Layout viewBox={{ x: -12, y: -12, width: 584, height: 190 }} extensions={{ themeStyles: [coreStyle] }}>
      {(['light', 'dark'] as const).map((mode, index) => (
        <ServiceBlock
          key={mode}
          namespace="example"
          type="serviceBlock"
          id={mode}
          localNamespace
          name="UserService"
          description={i18n.description}
          width={270}
          theme={{ style: coreStyle.name, mode }}
          transforms={[{ kind: 'translate', x: index * 290, y: 0 }]}
          logic={{
            id: 'logic',
            title: i18n.title,
            body: { kind: 'steps', steps: i18n.steps },
          }}
        />
      ))}
    </Layout>
  );
};

export default Demo;
