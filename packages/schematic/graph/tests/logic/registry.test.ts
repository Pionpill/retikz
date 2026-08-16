import type { IRNode, ResolvedTheme } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

type RoleDefinition = Readonly<{
  role: string;
  shape: NonNullable<IRNode['shape']>;
  padding: NonNullable<IRNode['padding']>;
  minimumSize?: NonNullable<IRNode['minimumSize']>;
}>;

type VariantDefinition = Readonly<{
  variant: string;
  resolve: (context: Readonly<{ theme: ResolvedTheme; color: string }>) => Readonly<Record<string, unknown>>;
}>;

type ThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => Readonly<{ tokens: Readonly<Record<string, unknown>> }>;
}>;

const publicFunction = <T extends (...args: Array<never>) => unknown>(name: string): T => {
  const value = (Graph as Record<string, unknown>)[name];
  expect(value, `missing public export ${name}`).toBeTypeOf('function');
  return value as T;
};

describe('Graph extension contracts', () => {
  it('preserves one Entity role definition through the stable author hook', () => {
    const define = publicFunction<(definition: RoleDefinition) => RoleDefinition>('defineEntityRole');
    const definition: RoleDefinition = {
      role: 'service',
      shape: { type: 'rectangle', params: { cornerRadius: 4 } },
      padding: { x: 10, y: 6 },
      minimumSize: { width: 64, height: 32 },
    };

    expect(define(definition)).toBe(definition);
  });

  it('preserves one Entity variant definition through the stable author hook', () => {
    const define = publicFunction<(definition: VariantDefinition) => VariantDefinition>('defineEntityVariant');
    const definition: VariantDefinition = {
      variant: 'muted',
      resolve: ({ color }) => ({ 'graph.entity.fill': color, 'graph.entity.stroke': 'none' }),
    };

    expect(define(definition)).toBe(definition);
  });

  it('preserves one Graph Theme style definition through the stable author hook', () => {
    const define = publicFunction<(definition: ThemeStyleDefinition) => ThemeStyleDefinition>('defineGraphThemeStyle');
    const definition: ThemeStyleDefinition = {
      name: 'brand',
      resolve: () => ({ tokens: {} }),
    };

    expect(define(definition)).toBe(definition);
  });
});

describe('Graph definition registry diagnostics', () => {
  it('rejects a custom role that collides with a builtin role', () => {
    const duplicate = Graph.defineEntityRole({ role: 'stage', shape: 'circle', padding: 0 });

    expect(() => Graph.createGraphDefinitions({ entityRoles: [duplicate] })).toThrow(/role 'stage'.*registered/i);
  });

  it('rejects duplicate custom role and variant keys', () => {
    const firstRole = Graph.defineEntityRole({ role: 'service', shape: 'circle', padding: 0 });
    const secondRole = Graph.defineEntityRole({ role: 'service', shape: 'rectangle', padding: 4 });
    const firstVariant = Graph.defineEntityVariant({ variant: 'muted', resolve: () => ({}) });
    const secondVariant = Graph.defineEntityVariant({ variant: 'muted', resolve: () => ({}) });

    expect(() => Graph.createGraphDefinitions({ entityRoles: [firstRole, secondRole] })).toThrow(
      /role 'service'.*registered/i,
    );
    expect(() => Graph.createGraphDefinitions({ entityVariants: [firstVariant, secondVariant] })).toThrow(
      /variant 'muted'.*registered/i,
    );
  });

  it('rejects blank role, variant, and Graph Theme style keys at registry assembly', () => {
    const blankRole = Graph.defineEntityRole({ role: ' ', shape: 'circle', padding: 0 });
    const blankVariant = Graph.defineEntityVariant({ variant: '', resolve: () => ({}) });
    const blankStyle = Graph.defineGraphThemeStyle({ name: ' ', resolve: () => ({ tokens: {} as never }) });

    expect(() => Graph.createGraphDefinitions({ entityRoles: [blankRole] })).toThrow(/role.*non-empty|role.*blank/i);
    expect(() => Graph.createGraphDefinitions({ entityVariants: [blankVariant] })).toThrow(
      /variant.*non-empty|variant.*blank/i,
    );
    expect(() => Graph.createGraphDefinitions({ graphThemeStyles: [blankStyle] })).toThrow(
      /theme style.*non-empty|theme style.*blank/i,
    );
  });
});
