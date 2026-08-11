import { ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getDefaultTableThemePreset, TableThemeTokenKeySchema, TableThemeTokenPresetMapSchema } from '../../src';

describe('default Table theme token presets', () => {
  it('provides two complete detached default preset maps', () => {
    for (const mode of Object.values(ThemeMode)) {
      const tokens = getDefaultTableThemePreset(mode);
      expect(TableThemeTokenPresetMapSchema.parse(tokens)).toEqual(tokens);
      expect(Object.keys(tokens)).toEqual(TableThemeTokenKeySchema.options.filter(key => key !== 'data.categorical'));
      expect(Object.isFrozen(tokens)).toBe(false);
      expect(Object.isFrozen(tokens['data.sequential'])).toBe(false);
    }
  });

  it('keeps the observable default values', () => {
    expect(getDefaultTableThemePreset(ThemeMode.Light)).toMatchObject({
      'cell.background.fill': '#ffffff',
      'cell.content.color': '#18181b',
      'columnHeader.content.color': '#71717a',
      'table.border.horizontal': { kind: 'line', stroke: '#e4e4e7', width: 1 },
      'table.border.vertical': null,
    });
  });
});
