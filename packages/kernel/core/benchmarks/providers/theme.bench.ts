import { resolveCoreThemeColors, resolveDefaultCoreThemeColors } from '@retikz/core';
import type { ThemeColorOverrides } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

for (const mode of ['light', 'dark'] as const) {
  defineBenchmark({ id: `providers/theme/default/${mode}`, dimensions: ['Theme colors', mode, '默认16色'] }, () => ({
    run: () => resolveDefaultCoreThemeColors(mode),
    verify: result => {
      expect(result.categorical).toHaveLength(16);
      expect(new Set(result.categorical).size).toBe(16);
      expect(Object.keys(result.semantic).sort()).toEqual(['error', 'guide', 'success', 'warning']);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.semantic)).toBe(true);
      expect(Object.isFrozen(result.categorical)).toBe(true);
    },
  }));
  for (const count of [8])
    defineBenchmark(
      {
        id: `providers/theme/override/${mode}/${count}`,
        dimensions: ['Theme colors', `${mode}/稀疏覆盖`, count ? `${count}色` : '保留默认palette'],
      },
      () => {
        const overrides: ThemeColorOverrides = {
          semantic: { error: '#ff0000' },
          ...(count
            ? {
                categorical: [
                  '#000000',
                  ...Array.from({ length: count - 1 }, (_, index) => `hsl(${index * 5}, 50%, 50%)`),
                ] as const,
              }
            : {}),
        };
        const preset = resolveDefaultCoreThemeColors(mode);
        return {
          run: () => resolveCoreThemeColors(mode, overrides),
          verify: result => {
            expect(result.semantic).toEqual({ ...preset.semantic, error: '#ff0000' });
            expect(result.categorical).toEqual(overrides.categorical ?? preset.categorical);
            expect(result.categorical).not.toBe(overrides.categorical ?? preset.categorical);
            expect(Object.isFrozen(result.semantic)).toBe(true);
            expect(Object.isFrozen(result.categorical)).toBe(true);
          },
        };
      },
    );
}
