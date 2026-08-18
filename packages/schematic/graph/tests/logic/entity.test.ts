import type { AnyCompositeDefinition, IRChild, IRNode, ThemeModeValue } from '@retikz/core';

import { lowerIRToKernel, ThemeMode } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IREntity } from '../../src';

import * as Graph from '../../src';

const position = [0, 0] as const;

const sceneOf = (children: ReadonlyArray<IRChild>, mode: ThemeModeValue = ThemeMode.Light) => ({
  version: 1 as const,
  type: 'scene' as const,
  theme: { mode },
  children: Array.from(children),
});

const lowerNode = (
  node: IREntity,
  mode: ThemeModeValue = ThemeMode.Light,
  composites: ReadonlyArray<AnyCompositeDefinition> = [Graph.EntityDefinition],
): IRNode => {
  const lowered = lowerIRToKernel(sceneOf([node], mode), { composites });
  const child = lowered.children[0];
  if (child.type !== 'node') throw new Error('Expected Entity to lower to a Core Node');
  return child;
};

describe('Entity canonical semantic IR', () => {
  it('uses one schema and role to represent all four graph node semantics', () => {
    const nodes = (['terminal', 'stage', 'decision', 'junction'] as const).map(role =>
      Graph.createEntity({ id: role, role, position }),
    );

    expect(nodes).toMatchObject(
      ['terminal', 'stage', 'decision', 'junction'].map(role => ({
        namespace: 'graph',
        type: 'entity',
        id: role,
        role,
      })),
    );
    nodes.forEach(node => {
      expect(Graph.EntitySchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
      expectTypeOf(node).toEqualTypeOf<IREntity>();
    });
  });

  it('rejects missing and old per-role discriminators while preserving open custom roles in Source IR', () => {
    expect(Graph.EntitySchema.safeParse({ namespace: 'graph', type: 'entity', id: 'missing', position }).success).toBe(
      false,
    );
    expect(
      Graph.EntitySchema.safeParse({
        namespace: 'graph',
        type: 'entity',
        id: 'custom',
        role: 'custom',
        position,
      }).success,
    ).toBe(true);
    expect(
      Graph.EntitySchema.safeParse({ namespace: 'graph', type: 'stage', id: 'legacy', role: 'stage', position })
        .success,
    ).toBe(false);
  });

  it('lowers each role to its default Core Node shape', () => {
    expect(lowerNode(Graph.createEntity({ id: 'terminal', role: 'terminal', position }))).toMatchObject({
      shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
      minimumSize: { width: 48, height: 24 },
      padding: { x: 12, y: 6 },
    });
    expect(lowerNode(Graph.createEntity({ id: 'stage', role: 'stage', position }))).toMatchObject({
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      padding: 8,
    });
    expect(lowerNode(Graph.createEntity({ id: 'decision', role: 'decision', position }))).toMatchObject({
      shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
      padding: { x: 3, y: 2 },
    });
    expect(lowerNode(Graph.createEntity({ id: 'junction', role: 'junction', position }))).toMatchObject({
      shape: 'circle',
      minimumSize: { width: 8, height: 8 },
      padding: 0,
    });
  });

  it('lets an explicit shape override the role default while keeping role in Graph IR', () => {
    const node = Graph.createEntity({ id: 'decision', role: 'decision', position, shape: 'rectangle' });

    expect(node).toMatchObject({ type: 'entity', role: 'decision', shape: 'rectangle' });
    expect(lowerNode(node)).toMatchObject({ type: 'node', shape: 'rectangle' });
  });

  it('lowers a custom role through the same configured definition registry', () => {
    const service = Graph.defineEntityRole({
      role: 'service',
      shape: { type: 'rectangle', params: { cornerRadius: 4 } },
      padding: { x: 10, y: 6 },
      minimumSize: { width: 64, height: 32 },
    });
    const composites = Graph.createGraphDefinitions({ entityRoles: [service] });

    expect(
      lowerNode(Graph.createEntity({ id: 'service', role: 'service', position }), ThemeMode.Light, composites),
    ).toMatchObject({
      type: 'node',
      shape: { type: 'rectangle', params: { cornerRadius: 4 } },
      padding: { x: 10, y: 6 },
      minimumSize: { width: 64, height: 32 },
    });
  });

  it('preserves a custom role shape for the Core shape registry to resolve', () => {
    const service = Graph.defineEntityRole({
      role: 'service',
      shape: 'service-shape',
      padding: 6,
    });

    expect(
      lowerNode(
        Graph.createEntity({ id: 'service', role: 'service', position }),
        ThemeMode.Light,
        Graph.createGraphDefinitions({ entityRoles: [service] }),
      ),
    ).toMatchObject({ shape: 'service-shape' });
  });

  it('fails loudly when an open role is not registered', () => {
    expect(() => lowerNode(Graph.createEntity({ id: 'unknown', role: 'service', position }))).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionNotRegistered,
        details: expect.objectContaining({ capability: 'Entity role', key: 'service' }),
      }),
    );
  });
});

describe('EntityVariant lowering', () => {
  it.each([
    ['default', ThemeMode.Light, { textColor: 'contrast', stroke: '#000000', fill: 'none' }],
    ['fill', ThemeMode.Light, { textColor: 'contrast', stroke: 'none', fill: '#000000' }],
    ['mixed', ThemeMode.Light, { textColor: 'contrast', stroke: '#000000', fill: '#d9d9d9' }],
    ['fill', ThemeMode.Dark, { textColor: 'contrast', stroke: 'none', fill: '#ffffff' }],
  ] as const)('applies the %s recipe in %s mode', (variant, mode, expected) => {
    const lowered = lowerNode(Graph.createEntity({ id: variant, role: 'stage', position, variant }), mode);
    expect(lowered).toMatchObject(expected);
  });

  it.each([
    [ThemeMode.Light, '#000000', '#d9d9d9'],
    [ThemeMode.Dark, '#ffffff', '#262626'],
  ] as const)('resolves currentColor to the mode foreground for every variant in %s mode', (mode, primary, mixed) => {
    const lower = (variant: IREntity['variant']) =>
      lowerNode(
        Graph.createEntity({ id: variant ?? 'default', role: 'stage', position, color: 'currentColor', variant }),
        mode,
      );

    expect(lower(undefined)).toMatchObject({ color: primary, textColor: 'contrast', stroke: primary, fill: 'none' });
    expect(lower('fill')).toMatchObject({ color: primary, textColor: 'contrast', stroke: 'none', fill: primary });
    expect(lower('mixed')).toMatchObject({ color: primary, textColor: 'contrast', stroke: primary, fill: mixed });
  });

  it('gives explicit leaf paint precedence over the selected recipe', () => {
    const lowered = lowerNode(
      Graph.createEntity({
        id: 'custom-paint',
        role: 'stage',
        position,
        color: '#cc3366',
        variant: 'fill',
        textColor: '#111111',
        stroke: '#222222',
        fill: '#333333',
        strokeWidth: 0,
        fillOpacity: 0,
      }),
    );

    expect(lowered).toMatchObject({
      color: '#cc3366',
      textColor: '#111111',
      stroke: '#222222',
      fill: '#333333',
      strokeWidth: 0,
      fillOpacity: 0,
    });
  });

  it('resolves a custom variant through the same configured definition registry', () => {
    const muted = Graph.defineEntityVariant({
      variant: 'muted',
      resolve: ({ color }) => ({
        [Graph.GraphThemeToken.EntityTextForeground]: color,
        [Graph.GraphThemeToken.EntityStroke]: 'none',
        [Graph.GraphThemeToken.EntityFill]: '#f2f2f2',
        [Graph.GraphThemeToken.EntityOpacity]: 0.75,
      }),
    });
    const composites = Graph.createGraphDefinitions({ entityVariants: [muted] });
    const lowered = lowerNode(
      Graph.createEntity({ id: 'muted', role: 'stage', position, color: '#336699', variant: 'muted' }),
      ThemeMode.Light,
      composites,
    );

    expect(lowered).toMatchObject({
      color: '#336699',
      textColor: '#336699',
      stroke: 'none',
      fill: '#f2f2f2',
      opacity: 0.75,
    });
  });

  it('wraps a custom variant callback failure and preserves its cause', () => {
    const cause = new Error('variant callback failed');
    const failing = Graph.defineEntityVariant({
      variant: 'failing',
      resolve: () => {
        throw cause;
      },
    });
    const composites = Graph.createGraphDefinitions({ entityVariants: [failing] });

    expect(() =>
      lowerNode(
        Graph.createEntity({ id: 'failing', role: 'stage', position, variant: 'failing' }),
        ThemeMode.Light,
        composites,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        cause,
        details: expect.objectContaining({ capability: 'entity-variant', key: 'failing' }),
      }),
    );
  });

  it('fails loudly when an open variant is not registered', () => {
    expect(() =>
      lowerNode(Graph.createEntity({ id: 'unknown-variant', role: 'stage', position, variant: 'muted' })),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionNotRegistered,
        details: expect.objectContaining({ capability: 'Entity variant', key: 'muted' }),
      }),
    );
  });

  it('does not leak Graph semantic fields into the lowered Core Node', () => {
    const lowered = lowerNode(Graph.createEntity({ id: 'lowered', role: 'decision', position, variant: 'fill' }));

    expect(lowered).not.toHaveProperty('namespace');
    expect(lowered).not.toHaveProperty('role');
    expect(lowered).not.toHaveProperty('variant');
  });
});
