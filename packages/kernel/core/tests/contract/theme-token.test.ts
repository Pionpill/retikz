import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyThemeTokenDefinition } from '../../src';

import { composeThemeTokenOverrides, defineThemeTokenNamespace } from '../../src';

const tokenSchema = z.strictObject({
  'surface.background': z.string().optional(),
});

describe('Theme token contract', () => {
  it('freezes a definition and preserves namespace/schema runtime identity', () => {
    const definition = defineThemeTokenNamespace({ namespace: 'plot', schema: tokenSchema });

    expect(Object.isFrozen(definition)).toBe(true);
    expect(definition.namespace).toBe('plot');
    expect(definition.schema).toBe(tokenSchema);
    expect(Reflect.set(definition, 'namespace', 'chart')).toBe(false);
    expect(Reflect.set(definition, 'schema', z.strictObject({}))).toBe(false);
    expect(definition.namespace).toBe('plot');
    expect(definition.schema).toBe(tokenSchema);
  });

  it('accepts JSON-safe contributions and emits a detached namespace bag in declaration order', () => {
    const plotDefinition = defineThemeTokenNamespace({ namespace: 'plot', schema: tokenSchema });
    const chartDefinition = defineThemeTokenNamespace({
      namespace: 'chart',
      schema: z.strictObject({ 'label.color': z.string().optional() }),
    });
    const contributions: Array<AnyThemeTokenDefinition> = [plotDefinition, chartDefinition];
    void contributions;

    const plotTokens = { 'surface.background': '#ffffff' };
    const bag = composeThemeTokenOverrides(
      { namespace: 'plot', tokens: plotTokens },
      { namespace: 'chart', tokens: { 'label.color': '#111111' } },
    );

    expect(bag).toEqual({
      plot: { 'surface.background': '#ffffff' },
      chart: { 'label.color': '#111111' },
    });
    expect(bag.plot).not.toBe(plotTokens);
    expect(Object.isFrozen(bag)).toBe(true);
    expect(Object.isFrozen(bag.plot)).toBe(true);
  });

  it.each([
    ['empty namespace', { namespace: '', tokens: {} }],
    ['function token', { namespace: 'plot', tokens: { callback: () => '#fff' } }],
    ['undefined token', { namespace: 'plot', tokens: { value: undefined } }],
    ['class token', { namespace: 'plot', tokens: { value: new (class Token {})() } }],
  ])('rejects non-JSON contribution: %s', (_label, contribution) => {
    expect(() => composeThemeTokenOverrides(contribution)).toThrow();
  });

  it('rejects duplicate contribution namespaces instead of last-wins merging', () => {
    expect(() =>
      composeThemeTokenOverrides(
        { namespace: 'plot', tokens: { 'surface.background': '#ffffff' } },
        { namespace: 'plot', tokens: { 'surface.background': '#000000' } },
      ),
    ).toThrow(/duplicate.*namespace.*plot/i);
  });
});
