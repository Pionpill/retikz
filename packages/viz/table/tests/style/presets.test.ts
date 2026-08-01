import { describe, expect, it } from 'vitest';

import {
  BUILTIN_TABLE_STYLE_TOKENS,
  TableStyle,
  TableStyleTokenKeySchema,
  TableStyleTokenMapSchema,
  TableThemeMode,
} from '../../src';

describe('built-in Table style presets', () => {
  it('provides eight complete detached frozen token maps', () => {
    for (const style of Object.values(TableStyle)) {
      for (const mode of Object.values(TableThemeMode)) {
        const tokens = BUILTIN_TABLE_STYLE_TOKENS[style][mode];
        expect(TableStyleTokenMapSchema.parse(tokens)).toEqual(tokens);
        expect(Object.keys(tokens)).toEqual(TableStyleTokenKeySchema.options);
        expect(Object.isFrozen(tokens)).toBe(true);
        expect(Object.isFrozen(tokens['data.categorical'])).toBe(true);
        expect(Object.isFrozen(tokens['data.sequential'])).toBe(true);
      }
    }
  });

  it('freezes the observable neutral, academic, vibrant, and clean distinctions', () => {
    expect(BUILTIN_TABLE_STYLE_TOKENS.neutral.light).toMatchObject({
      'cell.background.fill': '#ffffff',
      'cell.content.color': '#18181b',
      'columnHeader.content.color': '#71717a',
      'table.border.horizontal': { kind: 'line', stroke: '#e4e4e7', width: 1 },
      'table.border.vertical': null,
    });
    expect(BUILTIN_TABLE_STYLE_TOKENS.academic.dark).toMatchObject({
      'cell.content.font.family': 'serif',
      'table.border.top': { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
      'table.border.horizontal': null,
    });
    expect(BUILTIN_TABLE_STYLE_TOKENS.vibrant.light).toMatchObject({
      'cell.background.fill': '#e5ecf6',
      'table.border.vertical': { kind: 'line', stroke: '#ffffff', width: 1 },
    });
    for (const mode of Object.values(TableThemeMode)) {
      const clean = BUILTIN_TABLE_STYLE_TOKENS.clean[mode];
      expect(
        Object.entries(clean)
          .filter(([key]) => !key.startsWith('data.'))
          .every(([, value]) => value === null),
      ).toBe(true);
    }
  });
});
