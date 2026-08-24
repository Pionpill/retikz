import {
  compileToScene,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { primitivesOf } from './test-utils';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
} as const;

const entity = (input: Record<string, unknown> = {}) =>
  Graph.EntitySchema.parse({
    namespace: 'graph',
    type: 'entity',
    role: 'participant',
    position: [20, 30],
    ...input,
  });

describe('Entity lowering', () => {
  it('resolves and lowers one independent Entity to one Core Node', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveEntity(
      entity({ id: 'service', text: 'API', minimumSize: { width: 80, height: 20 } }),
      options,
    );
    const appearance = Graph.resolveEntityAppearance(canonical, { ...options, theme });

    expect(Graph.lowerEntity(canonical, appearance)).toEqual({
      type: 'node',
      id: 'service',
      position: [20, 30],
      text: 'API',
      shape: { type: 'hexagon' },
      padding: { x: 0, y: 8 },
      minimumSize: { width: 80, height: 36 },
      color: '#000000',
      textColor: 'contrast',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1,
      fillOpacity: 1,
      strokeOpacity: 1,
      opacity: 1,
    });
  });

  it('compiles a direct Entity Scene child and preserves omitted id', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.EntityProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      { type: 'scene', version: 1, children: [entity({ role: 'activity', text: 'work' })] },
      { ...definitions, padding: 0 },
    );
    const primitives = primitivesOf(output.scene.primitives);

    expect(primitives.length).toBeGreaterThan(0);
    expect(primitives.some(primitive => 'id' in primitive)).toBe(false);
  });

  it('fails only at lowering when position is absent without inventing an undefined identity', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveEntity(entity({ role: 'activity', position: undefined }), options);

    expect(() =>
      Graph.lowerEntity(canonical, Graph.resolveEntityAppearance(canonical, { ...options, theme })),
    ).toThrowError(
      expect.objectContaining({
        code: Graph.RetikzGraphErrorCode.CompileInvariant,
        message: expect.not.stringContaining('undefined'),
      }),
    );
  });

  it('fails through the Core Shape registry when a custom role references an unregistered shape', () => {
    const customRole = Graph.defineEntityRole({
      role: 'custom',
      description: 'Custom shape owner',
      shape: 'missing-shape',
      padding: 4,
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        {
          roots: [Graph.EntityProviderKey],
          providers: Graph.createGraphProviders({ entityRoles: [customRole] }),
        },
      ],
    });

    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [entity({ id: 'custom', role: 'custom' })] },
        { ...definitions, padding: 0 },
      ),
    ).toThrow(/Unknown shape 'missing-shape'/);
  });
});
