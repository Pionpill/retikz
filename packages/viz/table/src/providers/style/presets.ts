import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeStyle } from '@retikz/core';

import type { TableThemeTokenPresetMap } from '../../schemas';

import { TableThemeTokenPresetMapSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

const presets: Readonly<Record<ThemeModeValue, TableThemeTokenPresetMap>> = deepFreeze({
  light: TableThemeTokenPresetMapSchema.parse({
    'cell.background.fill': '#ffffff',
    'cell.background.fillOpacity': 1,
    'cell.content.color': '#18181b',
    'cell.content.font.family': 'sans-serif',
    'cell.content.font.weight': 400,
    'columnHeader.background.fill': '#ffffff',
    'columnHeader.background.fillOpacity': 1,
    'columnHeader.content.color': '#71717a',
    'columnHeader.content.font.family': 'sans-serif',
    'columnHeader.content.font.weight': 500,
    'table.border.top': null,
    'table.border.right': null,
    'table.border.bottom': null,
    'table.border.left': null,
    'table.border.horizontal': line('#e4e4e7', 1),
    'table.border.vertical': null,
    'columnHeader.border.bottom': line('#e4e4e7', 1),
    'data.sequential': ['#eff6ff', '#1d4ed8'],
  }),
  dark: TableThemeTokenPresetMapSchema.parse({
    'cell.background.fill': '#09090b',
    'cell.background.fillOpacity': 1,
    'cell.content.color': '#fafafa',
    'cell.content.font.family': 'sans-serif',
    'cell.content.font.weight': 400,
    'columnHeader.background.fill': '#09090b',
    'columnHeader.background.fillOpacity': 1,
    'columnHeader.content.color': '#a1a1aa',
    'columnHeader.content.font.family': 'sans-serif',
    'columnHeader.content.font.weight': 500,
    'table.border.top': null,
    'table.border.right': null,
    'table.border.bottom': null,
    'table.border.left': null,
    'table.border.horizontal': line('#27272a', 1),
    'table.border.vertical': null,
    'columnHeader.border.bottom': line('#27272a', 1),
    'data.sequential': ['#172554', '#60a5fa'],
  }),
});

/** Table 内置 Neutral 的两份 detached、递归冻结 token map */
export const BUILTIN_TABLE_THEME_TOKENS: Readonly<
  Record<BuiltinThemeStyleValue, Readonly<Record<ThemeModeValue, TableThemeTokenPresetMap>>>
> = deepFreeze({ [ThemeStyle.Neutral]: presets });

/** 读取唯一内建 Neutral Table style/mode 的 detached token 基线 */
export const getTableThemePreset = (_style: BuiltinThemeStyleValue, mode: ThemeModeValue): TableThemeTokenPresetMap => {
  return structuredClone(BUILTIN_TABLE_THEME_TOKENS[ThemeStyle.Neutral][mode]);
};
