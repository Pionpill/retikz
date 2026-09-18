import type { CoreDependencyProvider } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';

import { resolvePreviewTheme } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { themeCardComposite } from './theme-card';
import type { ThemeCardProps } from './theme-card';
import { previewControlContract } from './theme-inheritance.controls';

const ThemeCardProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'theme-demo', type: 'card' },
  dependencies: [],
  datasets: {},
  makeDefinition: () => themeCardComposite,
};

const themeCardAdapter: InputEmbedAdapter<ThemeCardProps> = {
  kind: 'theme-demo.card',
  lower: props => ({
    node: { namespace: 'theme-demo', type: 'card', label: props.label },
    providerDependencies: { roots: [ThemeCardProvider.key], providers: [ThemeCardProvider] },
  }),
};

type ThemeCardComponent = FC<ThemeCardProps> & {
  isTier2Embeddable: true;
  inputEmbedAdapter: InputEmbedAdapter<ThemeCardProps>;
};

const ThemeCard: ThemeCardComponent = Object.assign(() => null, {
  isTier2Embeddable: true as const,
  inputEmbedAdapter: themeCardAdapter,
});

export const previewControls = previewControlContract.controls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={240} height={140} theme={resolvePreviewTheme(values.style, values.mode)}>
    <ThemeCard label="Composite" />
  </Layout>
));

export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
