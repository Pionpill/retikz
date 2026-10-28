import { ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { getDefaultTableDefaults, TableDefaultsSchema } from '../../src';

describe('默认 Table 默认 Source', () => {
  it('提供两个分离的默认片段', () => {
    for (const mode of Object.values(ThemeMode)) {
      const defaults = getDefaultTableDefaults(mode);

      expect(TableDefaultsSchema.parse(defaults)).toEqual(defaults);
      expect(Object.isFrozen(defaults)).toBe(false);
      expect(Object.isFrozen(defaults.defaultAppearance)).toBe(false);
      expect(Object.isFrozen(defaults.defaultVisual?.sequential)).toBe(false);
    }
  });

  it('保留可观察的默认值', () => {
    expect(getDefaultTableDefaults(ThemeMode.Light)).toMatchObject({
      defaultAppearance: {
        body: {
          background: { fill: '#ffffff', fillOpacity: 1 },
          content: { defaults: { style: { color: '#18181b' } } },
        },
        columnHeader: {
          content: { defaults: { style: { color: '#71717a' } } },
          borders: { bottom: { kind: 'line', stroke: '#e4e4e7', width: 1 } },
        },
      },
      layout: { borders: { horizontal: { kind: 'line', stroke: '#e4e4e7', width: 1 } } },
      defaultVisual: { sequential: ['#eff6ff', '#1d4ed8'] },
    });
  });
});
