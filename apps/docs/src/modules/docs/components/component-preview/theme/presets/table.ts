import type { ResolvedTheme } from '@retikz/core';
import type { TableThemeStyleTokenOverrides } from '@retikz/table';

import { defineTableThemeStyle, TableThemeStyleTokenOverridesSchema } from '@retikz/table';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const styles = {
  academic: {
    light: {
      'cell.content.color': '#111111',
      'cell.content.font.family': 'serif',
      'columnHeader.content.color': '#111111',
      'columnHeader.content.font.family': 'serif',
      'columnHeader.content.font.weight': 600,
      'table.border.top': line('#111111', 1.2),
      'table.border.bottom': line('#111111', 1.2),
      'table.border.horizontal': null,
      'columnHeader.border.bottom': line('#111111', 0.8),
      'data.sequential': ['#f7fbff', '#08306b'],
    },
    dark: {
      'cell.background.fill': '#111111',
      'cell.content.color': '#f5f5f5',
      'cell.content.font.family': 'serif',
      'columnHeader.background.fill': '#111111',
      'columnHeader.content.color': '#f5f5f5',
      'columnHeader.content.font.family': 'serif',
      'columnHeader.content.font.weight': 600,
      'table.border.top': line('#f5f5f5', 1.2),
      'table.border.bottom': line('#f5f5f5', 1.2),
      'table.border.horizontal': null,
      'columnHeader.border.bottom': line('#a3a3a3', 0.8),
      'data.sequential': ['#1e3a5f', '#90caf9'],
    },
  },
  vibrant: {
    light: {
      'cell.background.fill': '#e5ecf6',
      'cell.content.color': '#2a3f5f',
      'columnHeader.background.fill': '#d7e3f4',
      'columnHeader.content.color': '#2a3f5f',
      'columnHeader.content.font.weight': 600,
      'table.border.horizontal': line('#ffffff', 1),
      'table.border.vertical': line('#ffffff', 1),
      'columnHeader.border.bottom': line('#ffffff', 1),
      'data.sequential': ['#dbeafe', '#2563eb'],
    },
    dark: {
      'cell.background.fill': '#111827',
      'cell.content.color': '#f0f6fc',
      'columnHeader.background.fill': '#1f2937',
      'columnHeader.content.color': '#f0f6fc',
      'columnHeader.content.font.weight': 600,
      'table.border.horizontal': line('#374151', 1),
      'table.border.vertical': line('#374151', 1),
      'columnHeader.border.bottom': line('#475569', 1),
    },
  },
  clean: {
    light: {
      'cell.background.fill': null,
      'cell.background.fillOpacity': null,
      'cell.content.color': null,
      'cell.content.font.family': null,
      'cell.content.font.weight': null,
      'columnHeader.background.fill': null,
      'columnHeader.background.fillOpacity': null,
      'columnHeader.content.color': null,
      'columnHeader.content.font.family': null,
      'columnHeader.content.font.weight': null,
      'table.border.horizontal': null,
      'columnHeader.border.bottom': null,
    },
    dark: {
      'cell.background.fill': null,
      'cell.background.fillOpacity': null,
      'cell.content.color': null,
      'cell.content.font.family': null,
      'cell.content.font.weight': null,
      'columnHeader.background.fill': null,
      'columnHeader.background.fillOpacity': null,
      'columnHeader.content.color': null,
      'columnHeader.content.font.family': null,
      'columnHeader.content.font.weight': null,
      'table.border.horizontal': null,
      'columnHeader.border.bottom': null,
    },
  },
} as const satisfies Record<ReferenceStyle, Record<ResolvedTheme['mode'], TableThemeStyleTokenOverrides>>;

const tokensOf = (style: ReferenceStyle, theme: ResolvedTheme): TableThemeStyleTokenOverrides =>
  TableThemeStyleTokenOverridesSchema.parse(structuredClone(styles[style][theme.mode]));

/** docs 维护的三个 Table reference Theme definitions */
export const PreviewTableThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineTableThemeStyle({ name: style, resolve: theme => tokensOf(style, theme) }));
