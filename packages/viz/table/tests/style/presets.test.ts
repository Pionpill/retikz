import { ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getDefaultTableDefaults, TableDefaultsSchema } from '../../src';

describe('default Table Source defaults', () => {
  it('provides two detached defaults fragments', () => {
    for (const mode of Object.values(ThemeMode)) {
      const defaults = getDefaultTableDefaults(mode);
      expect(TableDefaultsSchema.parse(defaults)).toEqual(defaults);
      expect(Object.isFrozen(defaults)).toBe(false);
      expect(Object.isFrozen(defaults.appearanceDefaults)).toBe(false);
      expect(Object.isFrozen(defaults.visualDefaults?.sequential)).toBe(false);
    }
  });

  it('keeps the observable default values', () => {
    expect(getDefaultTableDefaults(ThemeMode.Light)).toMatchObject({
      appearanceDefaults: {
        body: {
          background: { fill: '#ffffff', fillOpacity: 1 },
          content: { style: { color: '#18181b' } },
        },
        columnHeader: {
          content: { style: { color: '#71717a' } },
          borders: { bottom: { kind: 'line', stroke: '#e4e4e7', width: 1 } },
        },
      },
      layout: { borders: { horizontal: { kind: 'line', stroke: '#e4e4e7', width: 1 } } },
      visualDefaults: { sequential: ['#eff6ff', '#1d4ed8'] },
    });
  });
});
