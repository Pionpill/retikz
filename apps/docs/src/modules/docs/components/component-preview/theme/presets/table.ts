import type { ResolvedTheme } from '@retikz/core';
import type { TableThemeTokenPresetMap } from '@retikz/table';

import { defineTableThemeStyle, TableThemeTokenPresetMapSchema } from '@retikz/table';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'neutral'>;

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const styles = {
  academic: {
    light: {
      appearance: ['#ffffff', '#111111', '#ffffff', '#111111', 'serif', 400, 600],
      borders: [line('#111111', 1.2), null, line('#111111', 1.2), null, null, null, line('#111111', 0.8)],
      sequential: ['#f7fbff', '#08306b'],
    },
    dark: {
      appearance: ['#111111', '#f5f5f5', '#111111', '#f5f5f5', 'serif', 400, 600],
      borders: [line('#f5f5f5', 1.2), null, line('#f5f5f5', 1.2), null, null, null, line('#a3a3a3', 0.8)],
      sequential: ['#1e3a5f', '#90caf9'],
    },
  },
  vibrant: {
    light: {
      appearance: ['#e5ecf6', '#2a3f5f', '#d7e3f4', '#2a3f5f', 'sans-serif', 400, 600],
      borders: [null, null, null, null, line('#ffffff', 1), line('#ffffff', 1), line('#ffffff', 1)],
      sequential: ['#dbeafe', '#2563eb'],
    },
    dark: {
      appearance: ['#111827', '#f0f6fc', '#1f2937', '#f0f6fc', 'sans-serif', 400, 600],
      borders: [null, null, null, null, line('#374151', 1), line('#374151', 1), line('#475569', 1)],
      sequential: ['#172554', '#60a5fa'],
    },
  },
  clean: {
    light: {
      appearance: [null, null, null, null, null, null, null],
      borders: [null, null, null, null, null, null, null],
      sequential: ['#eff6ff', '#1d4ed8'],
    },
    dark: {
      appearance: [null, null, null, null, null, null, null],
      borders: [null, null, null, null, null, null, null],
      sequential: ['#172554', '#60a5fa'],
    },
  },
} as const;

const tokensOf = (style: ReferenceStyle, theme: ResolvedTheme): TableThemeTokenPresetMap => {
  const preset = styles[style][theme.mode];
  const [fill, color, headerFill, headerColor, family, weight, headerWeight] = preset.appearance;
  const [top, right, bottom, left, horizontal, vertical, headerBottom] = preset.borders;
  return TableThemeTokenPresetMapSchema.parse({
    'cell.background.fill': fill,
    'cell.background.fillOpacity': fill === null ? null : 1,
    'cell.content.color': color,
    'cell.content.font.family': family,
    'cell.content.font.weight': weight,
    'columnHeader.background.fill': headerFill,
    'columnHeader.background.fillOpacity': headerFill === null ? null : 1,
    'columnHeader.content.color': headerColor,
    'columnHeader.content.font.family': family,
    'columnHeader.content.font.weight': headerWeight,
    'table.border.top': top,
    'table.border.right': right,
    'table.border.bottom': bottom,
    'table.border.left': left,
    'table.border.horizontal': horizontal,
    'table.border.vertical': vertical,
    'columnHeader.border.bottom': headerBottom,
    'data.sequential': [...preset.sequential],
  });
};

/** docs 维护的三个 Table reference Theme definitions */
export const PreviewTableThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineTableThemeStyle({ name: style, resolve: theme => tokensOf(style, theme) }));
