import type { CoreDependencyProvider, IRNode, ThemeModeValue } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, ThemeMode } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import type { FC } from 'react';
import { z } from 'zod';

import { PreviewThemeStyle, resolvePreviewTheme } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './theme-inheritance.controls';

type ThemeCardProps = { label: string };

const cardFills = {
  [PreviewThemeStyle.Default]: {
    [ThemeMode.Light]: '#e2e8f0',
    [ThemeMode.Dark]: '#334155',
  },
  [PreviewThemeStyle.Academic]: {
    [ThemeMode.Light]: '#dbeafe',
    [ThemeMode.Dark]: '#1e3a8a',
  },
  [PreviewThemeStyle.Vibrant]: {
    [ThemeMode.Light]: '#fae8ff',
    [ThemeMode.Dark]: '#701a75',
  },
  [PreviewThemeStyle.Clean]: {
    [ThemeMode.Light]: '#f8fafc',
    [ThemeMode.Dark]: '#0f172a',
  },
} as const;

const isCardFillStyle = (style: string | undefined): style is keyof typeof cardFills =>
  style !== undefined && style in cardFills;

const resolveCardFill = (style: string | undefined, mode: ThemeModeValue): string => {
  const fills = isCardFillStyle(style) ? cardFills[style] : cardFills[PreviewThemeStyle.Default];
  return fills[mode];
};

const themeCardComposite = defineComposite({
  namespace: 'theme-demo',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-demo').describe('Identifies the composite namespace used by the theme demo.'),
    type: z.literal('card').describe('Selects the theme-aware card composite variant.'),
    label: z.string().describe('Provides the text rendered inside the theme-aware card.'),
  }),
  expand: (node, context) => {
    const colors = context.theme.colors;
    const visibleCategorical = colors.categorical.slice(0, 3);
    const swatchStartX = -((visibleCategorical.length - 1) * 18) / 2;
    const card: IRNode = {
      type: 'node',
      position: [0, -8],
      text: node.label,
      cornerRadius: 10,
      style: {
        fill: resolveCardFill(context.theme.style, context.theme.mode),
        stroke: colors.semantic.warning,
        strokeWidth: 2,
        textColor: colors.semantic.error,
      },
      layout: { minimumSize: { width: 132, height: 54 }, padding: 8 },
    };
    const swatches = visibleCategorical.map((color, index): IRNode => ({
      type: 'node',
      position: [swatchStartX + index * 18, 32],
      shape: 'circle',
      style: { fill: color, stroke: 'none' },
      layout: { minimumSize: 12, padding: 0 },
    }));
    return { children: [card, ...swatches] };
  },
});

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
  <Layout
    width={240}
    height={140}
    viewBox={{ x: -120, y: -70, width: 240, height: 140 }}
    theme={resolvePreviewTheme(values.style, values.mode)}
  >
    <ThemeCard label="Composite" />
  </Layout>
));

export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
