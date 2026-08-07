import { defineThemeTokenNamespace, resolveThemeTokenRegistry } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  definePlotThemeTokens,
  PlotThemeToken,
  PlotThemeTokenDefinition,
  PlotThemeTokenOverridesSchema,
} from '../../src';

describe('Plot Theme token definition', () => {
  it('exports one frozen plot namespace singleton and rejects a conflicting identity', () => {
    expect(Object.isFrozen(PlotThemeTokenDefinition)).toBe(true);
    expect(PlotThemeTokenDefinition.namespace).toBe('plot');
    expect(resolveThemeTokenRegistry([PlotThemeTokenDefinition, PlotThemeTokenDefinition]).get('plot')).toBe(
      PlotThemeTokenDefinition,
    );

    const conflicting = defineThemeTokenNamespace({
      namespace: 'plot',
      schema: PlotThemeTokenOverridesSchema,
    });
    expect(() => resolveThemeTokenRegistry([PlotThemeTokenDefinition, conflicting])).toThrow(/plot.*conflict/i);
  });

  it('creates a detached JSON-safe contribution and validates owner keys', () => {
    const input = {
      [PlotThemeToken.PlotPaletteSeries]: ['#2563eb'],
    };
    const contribution = definePlotThemeTokens(input);

    input[PlotThemeToken.PlotPaletteSeries] = ['#dc2626'];
    expect(contribution).toEqual({
      namespace: 'plot',
      tokens: { [PlotThemeToken.PlotPaletteSeries]: ['#2563eb'] },
    });
    expect(JSON.parse(JSON.stringify(contribution))).toEqual(contribution);
    expect(() => definePlotThemeTokens({ 'plot.unknown': '#fff' } as never)).toThrow();
  });

  it('rejects mutation of the exported definition object', () => {
    expect(Reflect.set(PlotThemeTokenDefinition, 'namespace', 'other')).toBe(false);
    expect(PlotThemeTokenDefinition.namespace).toBe('plot');
  });
});
