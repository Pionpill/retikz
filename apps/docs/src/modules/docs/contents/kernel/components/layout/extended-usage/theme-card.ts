import type { IRNode, ThemeModeValue } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, ThemeMode } from '@retikz/core';
import { z } from 'zod';

/** 主题卡片的输入属性 */
export type ThemeCardProps = { label: string };

const cardFills = {
  default: {
    [ThemeMode.Light]: '#e2e8f0',
    [ThemeMode.Dark]: '#334155',
  },
  academic: {
    [ThemeMode.Light]: '#dbeafe',
    [ThemeMode.Dark]: '#1e3a8a',
  },
  vibrant: {
    [ThemeMode.Light]: '#fae8ff',
    [ThemeMode.Dark]: '#701a75',
  },
  clean: {
    [ThemeMode.Light]: '#f8fafc',
    [ThemeMode.Dark]: '#0f172a',
  },
} as const;

const isCardFillStyle = (style: string | undefined): style is keyof typeof cardFills =>
  style !== undefined && style in cardFills;

const resolveCardFill = (style: string | undefined, mode: ThemeModeValue): string => {
  const fills = isCardFillStyle(style) ? cardFills[style] : cardFills.default;
  return fills[mode];
};

/** 主题配置示例使用的局部 CompositeDefinition */
export const themeCardComposite = defineComposite({
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
