import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { FC } from 'react';

import { CompositeBaseSchema, defineComposite, ThemeMode, ThemeStyle } from '@retikz/core';
import { Layout, Scope } from '@retikz/react';
import { z } from 'zod';

type ThemeCardProps = { label: string };

const cardTokens = {
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: { fill: '#e2e8f0', stroke: '#64748b', text: '#0f172a' },
    [ThemeMode.Dark]: { fill: '#334155', stroke: '#94a3b8', text: '#f8fafc' },
  },
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: { fill: '#dbeafe', stroke: '#2563eb', text: '#1e3a8a' },
    [ThemeMode.Dark]: { fill: '#1e3a8a', stroke: '#60a5fa', text: '#eff6ff' },
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: { fill: '#fae8ff', stroke: '#c026d3', text: '#701a75' },
    [ThemeMode.Dark]: { fill: '#701a75', stroke: '#e879f9', text: '#fdf4ff' },
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: { fill: '#f8fafc', stroke: '#0f172a', text: '#0f172a' },
    [ThemeMode.Dark]: { fill: '#0f172a', stroke: '#cbd5e1', text: '#f8fafc' },
  },
} as const;

const themeCardComposite = defineComposite({
  namespace: 'theme-demo',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('theme-demo').describe('Identifies the composite namespace used by the theme demo.'),
    type: z.literal('card').describe('Selects the theme-aware card composite variant.'),
    label: z.string().describe('Provides the text rendered inside the theme-aware card.'),
  }),
  expand: (node, context) => {
    const tokens = cardTokens[context.theme.style][context.theme.mode];
    return {
      type: 'node',
      position: [0, 0],
      text: node.label,
      minimumSize: { width: 112, height: 54 },
      padding: 8,
      cornerRadius: 10,
      fill: tokens.fill,
      stroke: tokens.stroke,
      strokeWidth: 2,
      textColor: tokens.text,
    };
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
    <ThemeCard label="根：学术 / 浅色" />
    <Scope transforms={[{ kind: 'translate', x: 200, y: 0 }]} theme={{ style: ThemeStyle.Vibrant }}>
      <ThemeCard label="局部：活力 / 浅色" />
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 400, y: 0 }]} theme={{ mode: ThemeMode.Dark }}>
      <ThemeCard label="局部：学术 / 深色" />
    </Scope>
  </Layout>
);

export default Demo;
