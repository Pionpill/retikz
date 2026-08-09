import type { IRNode, ThemeModeValue } from '@retikz/core';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC } from 'react';

import { CompositeBaseSchema, defineComposite, ThemeMode, ThemeStyle } from '@retikz/core';
import { Layout, Scope } from '@retikz/react';
import { z } from 'zod';

type ThemeCardProps = { label: string };

const cardFills = {
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: '#e2e8f0',
    [ThemeMode.Dark]: '#334155',
  },
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: '#dbeafe',
    [ThemeMode.Dark]: '#1e3a8a',
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: '#fae8ff',
    [ThemeMode.Dark]: '#701a75',
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: '#f8fafc',
    [ThemeMode.Dark]: '#0f172a',
  },
} as const;

const isCardFillStyle = (style: string): style is keyof typeof cardFills => style in cardFills;

const resolveCardFill = (style: string, mode: ThemeModeValue): string => {
  const fills = isCardFillStyle(style) ? cardFills[style] : cardFills[ThemeStyle.Neutral];
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
      minimumSize: { width: 132, height: 54 },
      padding: 8,
      cornerRadius: 10,
      fill: resolveCardFill(context.theme.style, context.theme.mode),
      stroke: colors.semantic.warning,
      strokeWidth: 2,
      textColor: colors.semantic.error,
    };
    const swatches = visibleCategorical.map(
      (color, index): IRNode => ({
        type: 'node',
        position: [swatchStartX + index * 18, 32],
        shape: 'circle',
        minimumSize: 12,
        padding: 0,
        fill: color,
        stroke: 'none',
      }),
    );
    return [card, ...swatches];
  },
});

const makeComposites = () => [themeCardComposite];

const themeCardAdapter: EmbeddableTier2Adapter<ThemeCardProps> = {
  displayName: 'ThemeCard',
  namespace: 'theme-demo',
  contribute: props => ({
    node: { namespace: 'theme-demo', type: 'card', label: props.label },
    datasets: {},
    makeComposites,
  }),
};

type ThemeCardComponent = FC<ThemeCardProps> & {
  isTier2Embeddable: true;
  embeddableAdapter: EmbeddableTier2Adapter<ThemeCardProps>;
};

const ThemeCard: ThemeCardComponent = Object.assign(() => null, {
  isTier2Embeddable: true as const,
  embeddableAdapter: themeCardAdapter,
});

const Demo: FC = () => (
  <Layout theme={{ style: ThemeStyle.Academic }} width={650} height={120}>
    <ThemeCard label="Root: academic / light" />
    <Scope transforms={[{ kind: 'translate', x: 200, y: 0 }]} theme={{ style: ThemeStyle.Vibrant }}>
      <ThemeCard label="Local: vibrant / light" />
    </Scope>
    <Scope
      transforms={[{ kind: 'translate', x: 400, y: 0 }]}
      theme={{
        mode: ThemeMode.Dark,
      }}
    >
      <ThemeCard label="Local: academic / dark" />
    </Scope>
  </Layout>
);

export default Demo;
