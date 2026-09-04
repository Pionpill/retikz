import type { CompileWarning, ResolvedTheme } from '@retikz/core';

import {
  compileToScene,
  DEFAULT_RESOLVED_THEME,
  defineThemeStyle,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  RetikzCoreErrorCode,
  ThemeMode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const themeWithStyle = (style: string): ResolvedTheme => ({ ...DEFAULT_RESOLVED_THEME, style });

const styleRegistry = (
  definition: Graph.GraphThemeStyleDefinition,
): ReadonlyMap<string, Graph.GraphThemeStyleDefinition> => new Map([[definition.name, definition]]);

describe('Graph Scope and Theme compile semantics', () => {
  it.each([
    { mode: ThemeMode.Light, color: '#000000' },
    { mode: ThemeMode.Dark, color: '#ffffff' },
  ])('provides the complete mode-aware Neutral Entity baseline in $mode mode', ({ mode, color }) => {
    const theme: ResolvedTheme = {
      ...DEFAULT_RESOLVED_THEME,
      mode,
      colors: resolveDefaultCoreThemeColors(mode),
    };

    expect(Graph.getDefaultGraphThemePreset(theme).entity.tokens).toEqual({
      color,
      textColor: 'contrast',
      fill: 0.08,
      stroke: 1,
      strokeWidth: 1,
      fillOpacity: 1,
      strokeOpacity: 1,
      opacity: 1,
    });
    expect(Graph.getDefaultGraphThemePreset(theme).group.tokens).toEqual({
      background: { fill: 'lightgray', fillOpacity: 0.04 },
      border: { stroke: 'lightgray', strokeWidth: 1, dashPattern: [4, 3] },
      cornerRadius: 4,
    });
    expect(Graph.getDefaultGraphThemePreset(theme).block.tokens).toEqual({
      background: { fill: 'none' },
      border: { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 },
      cornerRadius: 8,
    });
  });

  it('materializes a static Entity master into same-color stroke, opaque light fill, and contrast text', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { mode: ThemeMode.Light },
        children: [
          Graph.EntitySchema.parse({
            namespace: 'graph',
            type: 'entity',
            role: 'activity',
            position: [0, 0],
            text: 'Static master',
            color: '#336699',
          }),
        ],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#336699');
    expect(scene).toContain('#eff3f7');
    expect(scene).toContain('#000000');
    expect(warnings).toEqual([]);
  });

  it('fails loudly for a non-static Entity master until both contextual paint channels are overridden', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const source = {
      namespace: 'graph',
      type: 'entity',
      role: 'activity',
      position: [0, 0],
      text: 'Inherited CSS color',
      color: 'currentColor',
    } as const;

    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [Graph.EntitySchema.parse(source)] },
        { ...definitions, padding: 0 },
      ),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzCoreErrorCode.LayoutProbeRecoverable,
        cause: expect.objectContaining({ code: RetikzCoreErrorCode.Color }),
      }),
    );

    const warnings: Array<CompileWarning> = [];
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [Graph.EntitySchema.parse({ ...source, fill: '#f1f5f9', stroke: 'currentColor' })],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );

    expect(JSON.stringify(output.scene)).toContain('#f1f5f9');
    expect(warnings).toEqual([]);
  });

  it('在最终 Entity 实例主色后解析 Graph Theme 的数值 fill', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'contextual-entity',
      resolve: () => ({ entity: { tokens: { fill: 0.2 } } }),
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.EntityProviderKey],
          providers: Graph.createGraphProviders({ graphThemeStyles: [definition] }),
        },
      ],
    });
    const coreStyle = defineThemeStyle({ name: definition.name, resolve: () => ({}) });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { style: definition.name, mode: 'light' },
        children: [
          Graph.EntitySchema.parse({
            namespace: 'graph',
            type: 'entity',
            role: 'activity',
            position: [0, 0],
            color: '#336699',
          }),
        ],
      },
      { ...definitions, themeStyles: [coreStyle], padding: 0 },
    );

    expect(JSON.stringify(output.scene)).toContain('#d6e0eb');
    expect(JSON.stringify(output.scene)).not.toContain('"fill":0.2');
  });

  it('按 Relation -> label / marker 主色链解析 Graph Theme 数值 token', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'contextual-relation',
      resolve: () => ({
        relation: {
          tokens: {
            color: '#336699',
            stroke: 0.2,
            labelTextForeground: 0.6,
            targetMarker: { color: 0.8, fill: 0.25 },
          },
        },
      }),
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.RelationProviderKey],
          providers: Graph.createGraphProviders({ graphThemeStyles: [definition] }),
        },
      ],
    });
    const coreStyle = defineThemeStyle({ name: definition.name, resolve: () => ({}) });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        theme: { style: definition.name, mode: 'light' },
        children: [
          { type: 'node', id: 'source', position: [0, 0] },
          { type: 'node', id: 'target', position: [80, 0] },
          Graph.RelationSchema.parse({
            namespace: 'graph',
            type: 'relation',
            source: { id: 'source' },
            target: { id: 'target' },
            role: 'generalization',
            labels: [{ text: 'edge' }],
          }),
        ],
      },
      { ...definitions, themeStyles: [coreStyle], padding: 0 },
    );
    const scene = JSON.stringify(output.scene);

    expect(scene).toContain('#d6e0eb');
    expect(scene).toContain('#85a3c2');
    expect(scene).toContain('#d6e1eb');
  });

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
      group: defaults.group,
      block: defaults.block,
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
      group: defaults.group,
      block: defaults.block,
    });
  });

  it('fills omitted Group and Block shell tokens from the Neutral preset', () => {
    const definition = Graph.defineGraphThemeStyle({
      name: 'container-shells',
      resolve: () => ({
        group: { tokens: { cornerRadius: 2 } },
        block: { tokens: { background: { fill: '#f8fafc', fillOpacity: 0.75 } } },
      }),
    });
    const theme = themeWithStyle(definition.name);
    const defaults = Graph.getDefaultGraphThemePreset(theme);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition))).toEqual({
      entity: defaults.entity,
      relation: defaults.relation,
      group: {
        tokens: {
          ...defaults.group.tokens,
          cornerRadius: 2,
        },
      },
      block: {
        tokens: {
          ...defaults.block.tokens,
          background: { fill: '#f8fafc', fillOpacity: 0.75 },
        },
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
      stroke: 1,
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

  it.each(['group', 'block'] as const)('rejects explicitly empty %s shell tokens as a callback failure', member => {
    const definition = {
      name: `empty-${member}-tokens`,
      resolve: () => ({ [member]: { tokens: {} } }),
    };

    expect(() =>
      Reflect.apply(Graph.resolveGraphTheme, undefined, [
        themeWithStyle(definition.name),
        new Map([[definition.name, definition]]),
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme-style', key: definition.name },
      }),
    );
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

  it('rejects non-plain Graph Theme style output containers', () => {
    class EntityTokensOutput {
      readonly color = '#2563eb';
    }

    const getterOutput = Object.defineProperty({}, 'entity', {
      enumerable: true,
      get: () => ({ tokens: { color: '#2563eb' } }),
    });
    const symbolOutput = { entity: { tokens: { color: '#2563eb' } }, [Symbol('metadata')]: true };
    const invalidDefinitions = [
      { name: 'class-tokens', resolve: () => ({ entity: { tokens: new EntityTokensOutput() } }) },
      { name: 'getter-output', resolve: () => getterOutput },
      { name: 'symbol-output', resolve: () => symbolOutput },
    ];

    for (const definition of invalidDefinitions) {
      expect(() =>
        Reflect.apply(Graph.resolveGraphTheme, undefined, [
          themeWithStyle(definition.name),
          new Map([[definition.name, definition]]),
        ]),
      ).toThrowError(
        expect.objectContaining({
          code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
          details: { capability: 'graph-theme-style', key: definition.name },
        }),
      );
    }
  });

  it('treats an explicitly undefined Graph style token as omitted', () => {
    const tokens = { color: '#2563eb' };
    Object.defineProperty(tokens, 'color', { enumerable: true, value: undefined });
    const definition = { name: 'undefined-token', resolve: () => ({ entity: { tokens } }) };
    const theme = themeWithStyle(definition.name);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).entity.tokens.color).toBe(
      Graph.getDefaultGraphThemePreset(theme).entity.tokens.color,
    );
  });

  it('treats an explicitly undefined Group shell token as omitted', () => {
    const tokens = { cornerRadius: 0 };
    Object.defineProperty(tokens, 'cornerRadius', { enumerable: true, value: undefined });
    const definition = { name: 'undefined-group-token', resolve: () => ({ group: { tokens } }) };
    const theme = themeWithStyle(definition.name);

    expect(Graph.resolveGraphTheme(theme, styleRegistry(definition)).group.tokens.cornerRadius).toBe(
      Graph.getDefaultGraphThemePreset(theme).group.tokens.cornerRadius,
    );
  });

  it('rejects an unknown Graph style token even when its value is undefined', () => {
    const definition = {
      name: 'unknown-undefined-token',
      resolve: () => ({ entity: { tokens: { unknown: undefined } } }),
    };

    expect(() =>
      Reflect.apply(Graph.resolveGraphTheme, undefined, [
        themeWithStyle(definition.name),
        new Map([[definition.name, definition]]),
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme-style', key: definition.name },
      }),
    );
  });

  it('rejects an unknown Group shell token even when its value is undefined', () => {
    const definition = {
      name: 'unknown-undefined-group-token',
      resolve: () => ({ group: { tokens: { unknown: undefined } } }),
    };

    expect(() =>
      Reflect.apply(Graph.resolveGraphTheme, undefined, [
        themeWithStyle(definition.name),
        new Map([[definition.name, definition]]),
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.DefinitionCallbackFailed,
        details: { capability: 'graph-theme-style', key: definition.name },
      }),
    );
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
