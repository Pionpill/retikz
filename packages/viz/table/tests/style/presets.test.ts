import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { BUILTIN_TABLE_THEME_TOKENS, TableThemeTokenKeySchema, TableThemeTokenPresetMapSchema } from '../../src';

describe('built-in Table theme token presets', () => {
  it('provides two complete detached frozen Neutral preset maps', () => {
    for (const style of Object.values(ThemeStyle)) {
      for (const mode of Object.values(ThemeMode)) {
        const tokens = BUILTIN_TABLE_THEME_TOKENS[style][mode];
        expect(TableThemeTokenPresetMapSchema.parse(tokens)).toEqual(tokens);
        expect(Object.keys(tokens)).toEqual(TableThemeTokenKeySchema.options.filter(key => key !== 'data.categorical'));
        expect(Object.isFrozen(tokens)).toBe(true);
        expect(Object.isFrozen(tokens['data.sequential'])).toBe(true);
      }
    }
  });

  it('freezes the observable Neutral defaults', () => {
    expect(BUILTIN_TABLE_THEME_TOKENS.neutral.light).toMatchObject({
      'cell.background.fill': '#ffffff',
      'cell.content.color': '#18181b',
      'columnHeader.content.color': '#71717a',
      'table.border.horizontal': { kind: 'line', stroke: '#e4e4e7', width: 1 },
      'table.border.vertical': null,
    });
  });
});
