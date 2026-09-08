import type { IRChartDefaults } from '@retikz/chart';
import type { NodeTextAlignValue } from '@retikz/core';

import { ChartDefaultsSchema, defineChartTheme } from '@retikz/chart';
import { NodeTextAlign as TextAlign } from '@retikz/core';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const styles = {
  academic: {
    padding: 16,
    gap: 6,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    typography: [
      [18, 600, 22],
      [13, 400, 18],
      [11, 400, 15],
      [11, 400, 15],
    ],
  },
  vibrant: {
    padding: 16,
    gap: 8,
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    typography: [
      [20, 700, 24],
      [14, 500, 19],
      [11, 400, 15],
      [11, 500, 15],
    ],
  },
  clean: {
    padding: 20,
    gap: 8,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    typography: [
      [20, 700, 25],
      [13, 400, 18],
      [11, 400, 16],
      [10, 500, 14],
    ],
  },
} as const;

const defaultsOf = (style: ReferenceStyle): IRChartDefaults => {
  const preset = styles[style];
  const slots = ['title', 'subtitle', 'note', 'source'] as const;
  const presentation = Object.fromEntries(
    slots.map((slot, index) => {
      const [size, weight, lineHeight] = preset.typography[index];
      return [
        slot,
        {
          style: { font: { family: preset.fontFamily, size, weight } },
          layout: { align: TextAlign.Start, lineHeight },
        },
      ];
    }),
  ) as Record<
    (typeof slots)[number],
    {
      style: { font: { family: string; size: number; weight: number } };
      layout: { align: NodeTextAlignValue; lineHeight: number };
    }
  >;
  return ChartDefaultsSchema.parse({
    layout: { padding: preset.padding, gap: preset.gap },
    presentation,
  });
};

/** docs 维护的三个 Chart reference Theme definitions */
export const PreviewChartThemeDefinitions = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(name => defineChartTheme({ name, defaults: defaultsOf(name) }));
