import type { CompileWarning, ResolvedTheme } from '@retikz/core';

import { compileToScene, DEFAULT_RESOLVED_THEME, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const themeWithStyle = (style: string): ResolvedTheme => ({ ...DEFAULT_RESOLVED_THEME, style });

const styleRegistry = (
  definition: Graph.GraphThemeStyleDefinition,
): ReadonlyMap<string, Graph.GraphThemeStyleDefinition> => new Map([[definition.name, definition]]);

describe('Graph Scope and Theme compile semantics', () => {
  it('compiles Graph Core Theme/default channels and graphTheme through the emitted Scope', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.GraphSchema.parse({
            namespace: 'graph',
            type: 'graph',
            theme: { mode: 'dark' },
            nodeDefault: { dashed: true },
            pathDefault: { lineCap: 'round' },
            labelDefault: { font: { size: 11 } },
            arrowDefault: { length: 12 },
            graphTheme: {
              rules: [
                { type: 'entity', appearance: { fill: '#ef4444' } },
                { type: 'relation', appearance: { stroke: '#22c55e' } },
              ],
            },
            children: [
              {
                namespace: 'graph',
                type: 'entity',
                id: 'source',
                role: 'activity',
                position: [0, 0],
                text: 'A',
                label: { text: 'source label', position: 'top' },
              },
              { namespace: 'graph', type: 'entity', id: 'target', role: 'activity', position: [100, 0], text: 'B' },
              {
                namespace: 'graph',
                type: 'relation',
                id: 'edge',
                source: { id: 'source' },
                target: { id: 'target' },
                role: 'dependency',
                labels: [{ text: 'link', position: 0.5 }],
              },
            ],
          }),
        ],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#ef4444');
    expect(scene).toContain('#22c55e');
    expect(scene).toContain('dashPattern');
    expect(scene).toContain('round');
    expect(scene).toContain('11');
    expect(scene).toContain('12');
    expect(warnings).toEqual([]);
  });

  it('honors resetStyle on Graph instead of leaking outer Scope defaults', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            nodeDefault: { dashed: true },
            children: [
              {
                namespace: 'graph',
                type: 'graph',
                resetStyle: ['node'],
                children: [{ namespace: 'graph', type: 'entity', role: 'activity', position: [0, 0], text: 'reset' }],
              },
            ],
          },
        ],
      },
      { ...definitions, padding: 0 },
    );

    expect(JSON.stringify(output.scene)).not.toContain('dashPattern');
  });

  it('fills omitted Entity style tokens from the mode-aware default preset', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'entity-color-only',
      resolve: () => ({ entity: { tokens: { color: '#2563eb' } } }),
    });
    const theme = themeWithStyle(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition))).toEqual({
      entity: {
        ...defaults.entity,
        tokens: { ...defaults.entity.tokens, color: '#2563eb' },
      },
      relation: defaults.relation,
    });
  });

  it('fills omitted Relation style tokens from the mode-aware default preset', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'relation-stroke-only',
      resolve: () => ({ relation: { tokens: { stroke: '#16a34a' } } }),
    });
    const theme = themeWithStyle(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition))).toEqual({
      entity: defaults.entity,
      relation: {
        ...defaults.relation,
        tokens: { ...defaults.relation.tokens, stroke: '#16a34a' },
      },
    });
  });

  it('keeps the Neutral baseline when a custom style provides an empty rule list', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'empty-rule-list',
      resolve: () => ({ entity: { rules: [] } }),
    });
    const theme = themeWithStyle(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).entity.rules).toEqual(defaults.entity.rules);
  });

  it('applies custom Entity rules by semantic selector without a visual selector key', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'fill-rule-override',
      resolve: () => ({
        entity: {
          rules: [
            {
              type: Graph.GraphType.Entity,
              selector: { role: Graph.EntityRole.Activity },
              appearance: { fill: '#f97316' },
            },
          ],
        },
      }),
    });
    const theme = themeWithStyle(definition.name);
    const options = Graph.resolveGraphDefinitionOptions({ graphThemeStyles: [definition] });
    const entity = Graph.resolveEntity(
      Graph.EntitySchema.parse({
        namespace: Graph.GRAPH_NAMESPACE,
        type: Graph.GraphType.Entity,
        role: Graph.EntityRole.Activity,
      }),
      options,
    );

    expect(Graph.resolveEntityAppearance(entity, { ...options, theme })).toMatchObject({
      fill: '#f97316',
      stroke: 'currentColor',
    });
  });

  it('rejects an explicitly empty style token override as a callback failure', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'empty-entity-tokens',
      resolve: () => ({ entity: { tokens: {} } }),
    });

    try {
      Graph.resolveGraphTheme(themeWithStyle(definition.name), styleRegistry(definition));
      throw new Error('Expected Graph Theme style resolution to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme-style', key: definition.name },
      });
    }
  });

  it('wraps a Graph Theme style callback exception without replacing its cause', () => {
    const cause = new Error('custom style failed');
    const definition = Graph.defineGraphThemeStyle({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    try {
      Graph.resolveGraphTheme(themeWithStyle(definition.name), styleRegistry(definition));
      throw new Error('Expected Graph Theme style callback to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme-style', key: definition.name },
        cause,
      });
    }
  });

  it('keeps the unregistered Graph Theme style diagnostic unchanged', () => {
    try {
      Graph.resolveGraphTheme(themeWithStyle('missing-style'), new Map());
      throw new Error('Expected Graph Theme style lookup to fail.');
    } catch (error) {
      expect(error).toMatchObject({
        code: Graph.RetikzGraphErrorCode.DefinitionNotRegistered,
        details: { capability: 'graph-theme-style', key: 'missing-style' },
      });
    }
  });
});
