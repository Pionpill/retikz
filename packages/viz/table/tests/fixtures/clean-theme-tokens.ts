import type { IRTableThemeTokenOverrides } from '../../src';

/** 与迁入 docs 前 Clean preset 等价的 sparse Table token override */
export const CLEAN_TABLE_THEME_TOKENS = {
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
  'table.border.top': null,
  'table.border.right': null,
  'table.border.bottom': null,
  'table.border.left': null,
  'table.border.horizontal': null,
  'table.border.vertical': null,
  'columnHeader.border.bottom': null,
} as const satisfies IRTableThemeTokenOverrides;
