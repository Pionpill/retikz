import type { GroupPrim, IRChild, PathPrim, ScenePrimitive } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createSurface, SurfaceDefinition, SurfaceProvider } from '../../../src';
import {
  PathClipDefinition,
  PathClipProvider,
  PathClipShapeDefinition,
  PathClipShapeProvider,
} from '../../../src/clip';

const node: IRChild = {
  type: 'node',
  id: 'content',
  position: [0, 0],
  minimumSize: { width: 20, height: 10 },
  padding: 0,
  margin: 0,
  fill: '#cbd5e1',
  stroke: 'none',
};

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrim> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrim> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? pathsOf(primitive.children) : primitive.type === 'path' ? [primitive] : [],
  );

describe('Surface appearance, Scope, and spatial identity', () => {
  it('resolves the path clip dependency through the Surface provider graph', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        { roots: [SurfaceProvider.key], providers: [SurfaceProvider, PathClipProvider, PathClipShapeProvider] },
      ],
    });
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'provider-surface',
      child: { type: 'coordinate', id: 'origin', position: [0, 0] },
      overflow: 'clip',
      cornerRadius: 4,
    });

    expect(definitions.clips?.map(definition => definition.kind)).toEqual(['path']);
    expect(definitions.clipShapes?.map(definition => definition.kind)).toEqual(['path']);
    expect(() =>
      compileToScene({ type: 'scene', version: 1, children: [surface] }, { ...definitions, padding: 0 }),
    ).not.toThrow();
  });

  it('keeps background, isolated content, and border in fixed layers without changing allocation', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'surface-root',
      child: node,
      padding: 2,
      background: { fill: '#f8fafc', fillOpacity: 0.75 },
      border: { stroke: '#0f172a', strokeWidth: 4 },
      cornerRadius: 99,
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [SurfaceDefinition],
        clips: [PathClipDefinition],
        clipShapes: [PathClipShapeDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'surface-root');
    const paths = pathsOf(root?.children ?? []);
    const handle = result.spatialHandles.entries.find(entry => entry.role === 'surface');

    expect(root?.children.map(child => child.type)).toEqual(['path', 'group', 'path']);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatchObject({ fill: '#f8fafc', fillOpacity: 0.75 });
    expect(paths[0]?.stroke).toBe('none');
    expect(paths[1]).toMatchObject({ stroke: '#0f172a', strokeWidth: 4 });
    expect(paths[1]?.fill).toBe('none');
    expect(paths.flatMap(path => path.commands).filter(command => command.kind === 'arc')).toEqual(
      expect.arrayContaining([expect.objectContaining({ radius: 7 })]),
    );
    expect(handle?.geometry.bounds).toEqual({ x: 0, y: 0, width: 24, height: 14 });
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 24, height: 14 });
  });

  it('clips only the content with the rounded boundary while preserving an authored outer clip', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'clipped-surface',
      child: node,
      overflow: 'clip',
      cornerRadius: 4,
      background: { fill: '#fff' },
      border: { stroke: '#000' },
      clip: { kind: 'rect', x: 1, y: 1, width: 18, height: 8 },
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [SurfaceDefinition],
        clips: [PathClipDefinition],
        clipShapes: [PathClipShapeDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'clipped-surface');
    const content = root?.children.find((child): child is GroupPrim => child.type === 'group');
    const clipResources = (result.scene.resources ?? []).filter(resource => resource.kind === 'clip');

    expect(root?.clipRef).toBeDefined();
    expect(content?.clipRef).toBeDefined();
    expect(content?.clipRef).not.toBe(root?.clipRef);
    expect(root?.children.filter(child => child.type === 'path').every(path => !('clipRef' in path))).toBe(true);
    expect(clipResources).toHaveLength(2);
    expect(clipResources.find(resource => resource.id === content?.clipRef)?.path).toMatchObject({
      fillRule: 'nonzero',
      commands: expect.any(Array),
    });
  });

  it('applies complete outer Scope identity and transforms once while keeping internal style inheritance', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'styled-surface',
      child: node,
      border: { stroke: '#000' },
      pathDefault: { strokeWidth: 3 },
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
      meta: { owner: 'standard' },
      animations: [
        {
          property: 'opacity',
          duration: 100,
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
        },
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [SurfaceDefinition],
        clips: [PathClipDefinition],
        clipShapes: [PathClipShapeDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'styled-surface');
    const border = pathsOf(root?.children ?? []).find(path => path.stroke !== undefined);
    const handle = result.spatialHandles.entries.find(entry => entry.role === 'surface');

    expect(root).toMatchObject({
      id: 'styled-surface',
      meta: { owner: 'standard' },
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
    });
    expect(root?.animations).toHaveLength(1);
    expect(border?.strokeWidth).toBe(3);
    expect(handle?.geometry.bounds).toEqual({ x: 10, y: 20, width: 20, height: 10 });
  });

  it('prefixes a descendant handle without copying its key, role, tags, or payload', () => {
    const card = defineComposite({
      namespace: 'third',
      type: 'card',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('third'),
        type: z.literal('card'),
        id: z.string(),
      }),
      compile: (value, context) => ({
        allocationBounds: { x: 0, y: 0, width: 10, height: 6 },
        children: [
          context.scope(
            { id: value.id },
            [],
            [
              {
                key: 'body',
                role: 'card',
                bounds: { x: 0, y: 0, width: 10, height: 6 },
                tags: ['content'],
                payload: { domainId: 'a' },
              },
            ],
          ),
        ],
      }),
    });
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'surface-a',
      child: { namespace: 'third', type: 'card', id: 'card-a' },
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      { composites: [SurfaceDefinition, card], padding: 0 },
    );
    const descendant = result.spatialHandles.entries.find(entry => entry.role === 'card');

    expect(result.spatialHandles.entries.map(entry => entry.role)).toEqual(['surface', 'card']);
    expect(descendant).toMatchObject({
      ownerPath: [
        { namespace: 'standard', type: 'surface', instanceId: 'surface-a' },
        { namespace: 'third', type: 'card', instanceId: 'card-a' },
      ],
      key: 'body',
      role: 'card',
      tags: ['content'],
      payload: { domainId: 'a' },
    });
  });

  it('keeps a high-z child isolated between the background and border layers', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'isolated-surface',
      child: { ...node, zIndex: 99 },
      background: { fill: '#fff' },
      border: { stroke: '#000' },
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      { composites: [SurfaceDefinition], padding: 0 },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'isolated-surface');

    expect(root?.children.map(child => child.type)).toEqual(['path', 'group', 'path']);
    const content = root?.children[1];
    expect(content?.type).toBe('group');
    if (content?.type === 'group') expect(content.children.length).toBeGreaterThan(0);
  });

  it('emits finite rounded clip geometry for a degenerate child allocation', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'degenerate-surface',
      child: { type: 'coordinate', id: 'origin', position: [0, 0] },
      overflow: 'clip',
      cornerRadius: 10,
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [SurfaceDefinition],
        clips: [PathClipDefinition],
        clipShapes: [PathClipShapeDefinition],
        padding: 0,
      },
    );
    const clip = (result.scene.resources ?? []).find(resource => resource.kind === 'clip');

    expect(clip?.path).toMatchObject({ fillRule: 'nonzero', commands: expect.any(Array) });
    if (clip !== undefined) expect(JSON.stringify(clip.path.commands)).not.toMatch(/NaN|Infinity/);
  });
});
