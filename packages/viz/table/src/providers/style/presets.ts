import type { TableStyleTokenMap, TableStyleValue, TableThemeModeValue } from '../../schemas';

import { TableStyleTokenMapSchema } from '../../schemas';
import { deepFreeze } from '../../shared';

/** preset 组装时使用的 Cell 与列头 appearance 叶值 */
type PresetAppearance = Readonly<{
  /** body Cell 背景填充 */
  fill: string | null;
  /** body Cell 内容主色 */
  color: string | null;
  /** 列头 Cell 背景填充 */
  headerFill: string | null;
  /** 列头 Cell 内容主色 */
  headerColor: string | null;
  /** body 与列头共享的字体族 */
  family: string | null;
  /** body Cell 字重 */
  weight: number | null;
  /** 列头 Cell 字重 */
  headerWeight: number | null;
}>;

/** preset 组装时使用的七个 Border Graph token slot */
type PresetBorders = Readonly<{
  /** Table 顶侧外框 */
  top: TableStyleTokenMap['table.border.top'];
  /** Table 右侧外框 */
  right: TableStyleTokenMap['table.border.right'];
  /** Table 底侧外框 */
  bottom: TableStyleTokenMap['table.border.bottom'];
  /** Table 左侧外框 */
  left: TableStyleTokenMap['table.border.left'];
  /** Table 内部横线 */
  horizontal: TableStyleTokenMap['table.border.horizontal'];
  /** Table 内部竖线 */
  vertical: TableStyleTokenMap['table.border.vertical'];
  /** 列头 Cell 底边 */
  headerBottom: TableStyleTokenMap['columnHeader.border.bottom'];
}>;

/** 创建不暴露 priority 的 preset border line */
const line = (stroke: string, width: number) => ({ kind: 'line' as const, stroke, width });

/** 将分组输入收敛为经过 required schema 校验的完整冻结 token map */
const preset = (
  appearance: PresetAppearance,
  borders: PresetBorders,
  categorical: ReadonlyArray<string>,
  sequential: readonly [string, string],
): TableStyleTokenMap =>
  deepFreeze(
    structuredClone(
      TableStyleTokenMapSchema.parse({
        'cell.background.fill': appearance.fill,
        'cell.background.fillOpacity': appearance.fill === null ? null : 1,
        'cell.content.color': appearance.color,
        'cell.content.font.family': appearance.family,
        'cell.content.font.weight': appearance.weight,
        'columnHeader.background.fill': appearance.headerFill,
        'columnHeader.background.fillOpacity': appearance.headerFill === null ? null : 1,
        'columnHeader.content.color': appearance.headerColor,
        'columnHeader.content.font.family': appearance.family,
        'columnHeader.content.font.weight': appearance.headerWeight,
        'table.border.top': borders.top,
        'table.border.right': borders.right,
        'table.border.bottom': borders.bottom,
        'table.border.left': borders.left,
        'table.border.horizontal': borders.horizontal,
        'table.border.vertical': borders.vertical,
        'columnHeader.border.bottom': borders.headerBottom,
        'data.categorical': categorical,
        'data.sequential': sequential,
      }),
    ),
  );

const noOuter = { top: null, right: null, bottom: null, left: null } as const;
const cleanAppearance = {
  fill: null,
  color: null,
  headerFill: null,
  headerColor: null,
  family: null,
  weight: null,
  headerWeight: null,
} as const;
const cleanBorders = { ...noOuter, horizontal: null, vertical: null, headerBottom: null } as const;

const neutralLightCategorical = [
  '#e76e50',
  '#2a9d90',
  '#274754',
  '#e8c468',
  '#f4a462',
  '#6d5dfc',
  '#3b82f6',
  '#84cc16',
];
const neutralDarkCategorical = ['#f08a6e', '#45b8aa', '#6f8f9f', '#f0cf72', '#f6ad75', '#8b7cff', '#60a5fa', '#a3e635'];
const academicLightCategorical = [
  '#0072b2',
  '#d55e00',
  '#009e73',
  '#cc79a7',
  '#e69f00',
  '#56b4e9',
  '#000000',
  '#f0e442',
];
const academicDarkCategorical = [
  '#56b4e9',
  '#e69f00',
  '#009e73',
  '#f0e442',
  '#0072b2',
  '#d55e00',
  '#cc79a7',
  '#ffffff',
];
const vibrantCategorical = ['#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a', '#19d3f3', '#ff6692', '#b6e880'];

/** 八份完整、detached、递归冻结的 Table preset token map */
export const BUILTIN_TABLE_STYLE_TOKENS: Readonly<
  Record<TableStyleValue, Readonly<Record<TableThemeModeValue, TableStyleTokenMap>>>
> = deepFreeze({
  neutral: {
    light: preset(
      {
        fill: '#ffffff',
        color: '#18181b',
        headerFill: '#ffffff',
        headerColor: '#71717a',
        family: 'sans-serif',
        weight: 400,
        headerWeight: 500,
      },
      { ...noOuter, horizontal: line('#e4e4e7', 1), vertical: null, headerBottom: line('#e4e4e7', 1) },
      neutralLightCategorical,
      ['#eff6ff', '#1d4ed8'],
    ),
    dark: preset(
      {
        fill: '#09090b',
        color: '#fafafa',
        headerFill: '#09090b',
        headerColor: '#a1a1aa',
        family: 'sans-serif',
        weight: 400,
        headerWeight: 500,
      },
      { ...noOuter, horizontal: line('#27272a', 1), vertical: null, headerBottom: line('#27272a', 1) },
      neutralDarkCategorical,
      ['#172554', '#60a5fa'],
    ),
  },
  academic: {
    light: preset(
      {
        fill: '#ffffff',
        color: '#111111',
        headerFill: '#ffffff',
        headerColor: '#111111',
        family: 'serif',
        weight: 400,
        headerWeight: 600,
      },
      {
        top: line('#111111', 1.2),
        right: null,
        bottom: line('#111111', 1.2),
        left: null,
        horizontal: null,
        vertical: null,
        headerBottom: line('#111111', 0.8),
      },
      academicLightCategorical,
      ['#f7fbff', '#08306b'],
    ),
    dark: preset(
      {
        fill: '#111111',
        color: '#f5f5f5',
        headerFill: '#111111',
        headerColor: '#f5f5f5',
        family: 'serif',
        weight: 400,
        headerWeight: 600,
      },
      {
        top: line('#f5f5f5', 1.2),
        right: null,
        bottom: line('#f5f5f5', 1.2),
        left: null,
        horizontal: null,
        vertical: null,
        headerBottom: line('#a3a3a3', 0.8),
      },
      academicDarkCategorical,
      ['#1e3a5f', '#90caf9'],
    ),
  },
  vibrant: {
    light: preset(
      {
        fill: '#e5ecf6',
        color: '#2a3f5f',
        headerFill: '#d7e3f4',
        headerColor: '#2a3f5f',
        family: 'sans-serif',
        weight: 400,
        headerWeight: 600,
      },
      {
        ...noOuter,
        horizontal: line('#ffffff', 1),
        vertical: line('#ffffff', 1),
        headerBottom: line('#ffffff', 1),
      },
      vibrantCategorical,
      ['#dbeafe', '#2563eb'],
    ),
    dark: preset(
      {
        fill: '#111827',
        color: '#f0f6fc',
        headerFill: '#1f2937',
        headerColor: '#f0f6fc',
        family: 'sans-serif',
        weight: 400,
        headerWeight: 600,
      },
      {
        ...noOuter,
        horizontal: line('#374151', 1),
        vertical: line('#374151', 1),
        headerBottom: line('#475569', 1),
      },
      vibrantCategorical,
      ['#172554', '#60a5fa'],
    ),
  },
  clean: {
    light: preset(cleanAppearance, cleanBorders, neutralLightCategorical, ['#eff6ff', '#1d4ed8']),
    dark: preset(cleanAppearance, cleanBorders, neutralDarkCategorical, ['#172554', '#60a5fa']),
  },
});
