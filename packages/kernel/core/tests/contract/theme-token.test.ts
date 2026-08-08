import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineThemeTokenContribution, defineThemeTokenNamespace } from '../../src';

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

  it('accepts JSON-safe contributions and emits a detached frozen contribution', () => {
    const plotTokens = { 'surface.background': '#ffffff' };
    const contribution = defineThemeTokenContribution({ namespace: 'plot', tokens: plotTokens });

    expect(contribution).toEqual({ namespace: 'plot', tokens: { 'surface.background': '#ffffff' } });
    expect(contribution.tokens).not.toBe(plotTokens);
    expect(Object.isFrozen(contribution)).toBe(true);
    expect(Object.isFrozen(contribution.tokens)).toBe(true);
  });

  it.each([
    ['empty namespace', { namespace: '', tokens: {} }],
    ['function token', { namespace: 'plot', tokens: { callback: () => '#fff' } }],
    ['undefined token', { namespace: 'plot', tokens: { value: undefined } }],
    ['class token', { namespace: 'plot', tokens: { value: new (class Token {})() } }],
  ])('rejects non-JSON contribution: %s', (_label, contribution) => {
    expect(() => defineThemeTokenContribution(contribution)).toThrow();
  });
});
