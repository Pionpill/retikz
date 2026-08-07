import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { BUILTIN_TABLE_THEME_TOKENS, TableThemeTokenKeySchema, TableThemeTokenPresetMapSchema } from '../../src';

describe('built-in Table theme token presets', () => {
  it('provides eight complete detached frozen preset maps', () => {
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

  it('freezes the observable neutral, academic, vibrant, and clean distinctions', () => {
    expect(BUILTIN_TABLE_THEME_TOKENS.neutral.light).toMatchObject({
      'cell.background.fill': '#ffffff',
      'cell.content.color': '#18181b',
      'columnHeader.content.color': '#71717a',
      'table.border.horizontal': { kind: 'line', stroke: '#e4e4e7', width: 1 },
      'table.border.vertical': null,
    });
    expect(BUILTIN_TABLE_THEME_TOKENS.academic.dark).toMatchObject({
      'cell.content.font.family': 'serif',
      'table.border.top': { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
      'table.border.horizontal': null,
    });
    expect(BUILTIN_TABLE_THEME_TOKENS.vibrant.light).toMatchObject({
      'cell.background.fill': '#e5ecf6',
      'table.border.vertical': { kind: 'line', stroke: '#ffffff', width: 1 },
    });
    for (const mode of Object.values(ThemeMode)) {
      const clean = BUILTIN_TABLE_THEME_TOKENS.clean[mode];
      expect(
        Object.entries(clean)
          .filter(([key]) => key !== 'data.sequential')
          .every(([, value]) => value === null),
      ).toBe(true);
    }
  });
});
