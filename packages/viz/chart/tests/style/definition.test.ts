import { defineThemeTokenNamespace, resolveThemeTokenRegistry } from '@retikz/core';
import { PlotThemeTokenDefinition } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type { IRChartThemeTokenOverrides } from '../../src/style';

import { ChartThemeTokenDefinition, ChartThemeTokenOverridesSchema, defineChartThemeTokens } from '../../src/style';

const chartOverrides: IRChartThemeTokenOverrides = {
  'chart.padding': 24,
  'chart.axis.enabled': false,
};

describe('Chart theme token definition', () => {
  it('exports one frozen chart namespace definition and a detached contribution helper', () => {
    expect(Object.isFrozen(ChartThemeTokenDefinition)).toBe(true);
    expect(ChartThemeTokenDefinition.namespace).toBe('chart');
    expect(ChartThemeTokenDefinition.schema).toBe(ChartThemeTokenOverridesSchema);

    const input = { ...chartOverrides };
    const contribution = defineChartThemeTokens(input);
    input['chart.padding'] = 4;

    expect(Object.isFrozen(contribution)).toBe(true);
    expect(contribution).toEqual({ namespace: 'chart', tokens: chartOverrides });
    expect(contribution.tokens).not.toBe(input);
    expect(contribution.tokens['chart.padding']).toBe(24);
  });

  it('rejects unknown chart keys and explicit undefined values at the owner boundary', () => {
    expect(() =>
      ChartThemeTokenOverridesSchema.parse({
        'chart.unknown': true,
      }),
    ).toThrow();
    expect(() =>
      ChartThemeTokenOverridesSchema.parse({
        'chart.axis.enabled': undefined,
      }),
    ).toThrow();
    expect(() => defineChartThemeTokens({ 'chart.unknown': true } as never)).toThrow();
    expect(() => defineChartThemeTokens({ 'chart.axis.enabled': undefined })).toThrow();
  });

  it('uses identity de-duplication and rejects another frozen chart definition', () => {
    const registry = resolveThemeTokenRegistry([
      ChartThemeTokenDefinition,
      PlotThemeTokenDefinition,
      ChartThemeTokenDefinition,
    ]);
    expect(registry.get('chart')).toBe(ChartThemeTokenDefinition);
    expect(registry.get('plot')).toBe(PlotThemeTokenDefinition);

    const conflictingDefinition = defineThemeTokenNamespace<'chart', IRChartThemeTokenOverrides>({
      namespace: 'chart',
      schema: ChartThemeTokenOverridesSchema,
    });
    expect(Object.isFrozen(conflictingDefinition)).toBe(true);
    expect(conflictingDefinition).not.toBe(ChartThemeTokenDefinition);
    expect(() => resolveThemeTokenRegistry([ChartThemeTokenDefinition, conflictingDefinition])).toThrow(/chart/);
  });

  it('keeps the singleton namespace and schema identity after mutation attempts', () => {
    expect(Reflect.set(ChartThemeTokenDefinition, 'namespace', 'plot')).toBe(false);
    expect(Reflect.set(ChartThemeTokenDefinition, 'schema', ChartThemeTokenOverridesSchema)).toBe(false);
    expect(ChartThemeTokenDefinition.namespace).toBe('chart');
    expect(ChartThemeTokenDefinition.schema).toBe(ChartThemeTokenOverridesSchema);
  });
});
