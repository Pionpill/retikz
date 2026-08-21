import type { IRChild, IRNode, ResolvedThemeColors } from '@retikz/core';

import { ChildSchema, defineComposite, defineThemeStyle, lowerIRToKernel, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as Graph from '../../src';

const position = [0, 0] as const;

const coreColors = (mode: 'light' | 'dark'): ResolvedThemeColors => ({
  semantic: {
    error: mode === ThemeMode.Light ? '#aa0000' : '#ffaaaa',
    success: mode === ThemeMode.Light ? '#00aa00' : '#aaffaa',
    warning: mode === ThemeMode.Light ? '#aaaa00' : '#ffffaa',
    guide: mode === ThemeMode.Light ? '#666666' : '#cccccc',
  },
  categorical: ['#336699'],
});

const brandCoreTheme = defineThemeStyle({ name: 'brand', resolve: ({ mode }) => coreColors(mode) });

const brandGraphTheme = Graph.defineGraphThemeStyle({
  name: 'brand',
  resolve: theme => ({
    tokens: {
      ...Graph.getDefaultGraphThemePreset(theme),
      [Graph.GraphThemeToken.EntityColor]: '#00ff00',
    },
  }),
});

const sceneOf = (children: ReadonlyArray<IRChild>) => ({
  version: 1 as const,
  type: 'scene' as const,
  theme: { mode: ThemeMode.Light },
  children: Array.from(children),
});

const nodesOf = (children: ReadonlyArray<IRChild>): Array<IRNode> =>
  children.flatMap(child => {
    if ('namespace' in child) return [];
    if (child.type === 'node') return [child];
    if (child.type === 'scope') return nodesOf(child.children);
    return [];
  });

const nodeById = (children: ReadonlyArray<IRChild>, id: string): IRNode => {
  const node = nodesOf(children).find(candidate => candidate.id === id);
  if (node === undefined) throw new Error(`Expected Node '${id}'`);
  return node;
};

describe('Graph presentation root lowering', () => {
  it('lowers one Graph root to a same-id Core Scope and removes every Graph-owned field', () => {
    const graph = Graph.createGraph({
      id: 'workflow',
      entityVariant: 'fill',
      graphThemeTokens: { [Graph.GraphThemeToken.EntityColor]: '#336699' },
      graphThemeTokenRules: [
        {
          select: { role: 'stage' },
          tokens: { [Graph.GraphThemeToken.EntityStrokeWidth]: 2 },
        },
      ],
      children: [Graph.createEntity({ id: 'stage', role: 'stage', position })],
    });
    const lowered = lowerIRToKernel(sceneOf([graph]), { composites: Graph.createGraphDefinitions() });
    const root = lowered.children[0];

    expect(root).toMatchObject({ type: 'scope', id: 'workflow' });
    expect(nodeById(lowered.children, 'stage')).toMatchObject({
      type: 'node',
      color: '#336699',
      fill: '#336699',
      stroke: 'none',
      strokeWidth: 2,
    });
    expect(JSON.stringify(lowered)).not.toMatch(/graphTheme|entityVariant|"role"|"variant"|"namespace":"graph"/);
  });

  it('uses explicit Entity, nearest Container-or-Graph, and default variants in that order', () => {
    const graph = Graph.createGraph({
      id: 'variants',
      entityVariant: 'fill',
      children: [
        Graph.createEntity({ id: 'outer', role: 'stage', position }),
        Graph.createEntity({ id: 'explicit', role: 'stage', position, variant: 'fill' }),
        Graph.createGraph({
          id: 'inner',
          entityVariant: 'default',
          children: [
            Graph.createEntity({ id: 'inner-default', role: 'stage', position }),
            Graph.createEntity({ id: 'inner-reset', role: 'stage', position, variant: 'default' }),
          ],
        }),
      ],
    });
    const lowered = lowerIRToKernel(sceneOf([graph]), { composites: Graph.createGraphDefinitions() });

    expect(nodeById(lowered.children, 'outer')).toMatchObject({ fill: '#000000', stroke: 'none' });
    expect(nodeById(lowered.children, 'explicit')).toMatchObject({ fill: '#000000', stroke: 'none' });
    expect(nodeById(lowered.children, 'inner-default')).toMatchObject({ fill: 'none', stroke: '#000000' });
    expect(nodeById(lowered.children, 'inner-reset')).toMatchObject({ fill: 'none', stroke: '#000000' });
  });

  it('stops Graph tokens at a themed Core Scope while carrying the effective variant into the new Theme', () => {
    const graph = Graph.createGraph({
      id: 'theme-boundary',
      entityVariant: 'fill',
      graphThemeTokens: { [Graph.GraphThemeToken.EntityColor]: '#ff0000' },
      children: [
        Graph.createEntity({ id: 'outer-red', role: 'stage', position }),
        {
          type: 'scope',
          theme: { style: 'brand', mode: ThemeMode.Dark },
          children: [Graph.createEntity({ id: 'inner-brand', role: 'stage', position })],
        },
      ],
    });
    const lowered = lowerIRToKernel(sceneOf([graph]), {
      composites: Graph.createGraphDefinitions({ graphThemeStyles: [brandGraphTheme] }),
      themeStyles: [brandCoreTheme],
    });

    expect(nodeById(lowered.children, 'outer-red')).toMatchObject({
      color: '#ff0000',
      stroke: 'none',
      fill: '#ff0000',
    });
    expect(nodeById(lowered.children, 'inner-brand')).toMatchObject({
      color: '#00ff00',
      stroke: 'none',
      fill: '#00ff00',
    });
  });

  it('applies style and local selector rules in order, then preserves explicit Entity fields', () => {
    const service = Graph.defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });
    const styledGraph = Graph.defineGraphThemeStyle({
      name: 'brand',
      resolve: theme => ({
        tokens: Graph.getDefaultGraphThemePreset(theme),
        tokenRules: [
          {
            select: { role: 'service' },
            tokens: { [Graph.GraphThemeToken.EntityStrokeWidth]: 2 },
          },
          {
            select: { role: 'service', variant: 'mixed' },
            tokens: { [Graph.GraphThemeToken.EntityFill]: '#eeeeee' },
          },
        ],
      }),
    });
    const graph = Graph.createGraph({
      id: 'selectors',
      graphThemeTokenRules: [
        {
          select: { variant: ['mixed'] },
          tokens: { [Graph.GraphThemeToken.EntityStrokeWidth]: 3 },
        },
      ],
      children: [
        Graph.createEntity({ id: 'rule', role: 'service', variant: 'mixed', position }),
        Graph.createEntity({ id: 'explicit', role: 'service', variant: 'mixed', position, strokeWidth: 4 }),
        Graph.createEntity({ id: 'unmatched', role: 'stage', variant: 'default', position }),
      ],
    });
    const lowered = lowerIRToKernel(
      {
        ...sceneOf([graph]),
        theme: { style: 'brand', mode: ThemeMode.Light },
      },
      {
        composites: Graph.createGraphDefinitions({ entityRoles: [service], graphThemeStyles: [styledGraph] }),
        themeStyles: [brandCoreTheme],
      },
    );

    expect(nodeById(lowered.children, 'rule')).toMatchObject({ fill: '#eeeeee', strokeWidth: 3 });
    expect(nodeById(lowered.children, 'explicit')).toMatchObject({ fill: '#eeeeee', strokeWidth: 4 });
    expect(nodeById(lowered.children, 'unmatched')).toMatchObject({ fill: 'none', strokeWidth: 1 });
  });

  it('treats a third-party composite as opaque to Graph tokens and default variant', () => {
    const ThirdPartySchema = z.strictObject({
      namespace: z.literal('third-party'),
      type: z.literal('box'),
      child: ChildSchema,
    });
    const thirdParty = defineComposite({
      namespace: 'third-party',
      type: 'box',
      schema: ThirdPartySchema,
      expand: (node: z.infer<typeof ThirdPartySchema>) => ({ children: [node.child] }),
    });
    const graph = Graph.createGraph({
      id: 'opaque',
      entityVariant: 'fill',
      graphThemeTokens: { [Graph.GraphThemeToken.EntityColor]: '#ff0000' },
      children: [
        {
          namespace: 'third-party',
          type: 'box',
          child: Graph.createEntity({ id: 'opaque-child', role: 'stage', position }),
        },
      ],
    });
    const lowered = lowerIRToKernel(sceneOf([graph]), {
      composites: [...Graph.createGraphDefinitions(), thirdParty],
    });

    expect(nodeById(lowered.children, 'opaque-child')).toMatchObject({
      color: '#000000',
      fill: 'none',
      stroke: '#000000',
    });
  });
});
