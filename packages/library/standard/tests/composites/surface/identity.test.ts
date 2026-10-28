import type { GroupPrimitive, IRChild, PathPrimitive, ScenePrimitive } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { pathClipDefinition, pathClipProvider } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { createSurface, surfaceDefinition, surfaceProvider } from '../../../src/presentation';

const node: IRChild = {
  type: 'node',
  id: 'content',
  position: [0, 0],
  style: { fill: '#cbd5e1', stroke: 'none' },
  layout: { minimumSize: { width: 20, height: 10 }, padding: 0, margin: 0 },
};

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrimitive> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? pathsOf(primitive.children) : primitive.type === 'path' ? [primitive] : [],
  );

describe('Surface 外观与 Scope', () => {
  it('通过 Surface 提供者图解决路径裁剪依赖关系', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [surfaceProvider.key], providers: [surfaceProvider, pathClipProvider] }],
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
    expect(definitions).toEqual({ composites: [surfaceDefinition], clips: [pathClipDefinition] });
    expect(() =>
      compileToScene({ type: 'scene', version: 1, children: [surface] }, { ...definitions, padding: 0 }),
    ).not.toThrow();
  });

  it('将背景、隔离内容和边框保留在固定图层中，而不更改分配', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'surface-root',
      child: node,
      padding: 2,
      background: { fill: '#f8fafc', opacity: { fill: 0.75 } },
      border: { stroke: '#0f172a', strokeWidth: 4 },
      cornerRadius: 99,
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [surfaceDefinition],
        clips: [pathClipDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'surface-root');
    const paths = pathsOf(root?.children ?? []);

    expect(root?.children.map(child => child.type)).toEqual(['path', 'group', 'path']);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatchObject({ fill: '#f8fafc', fillOpacity: 0.75 });
    expect(paths[0]?.stroke).toBe('none');
    expect(paths[1]).toMatchObject({ stroke: '#0f172a', strokeWidth: 4 });
    expect(paths[1]?.fill).toBe('none');
    expect(paths.flatMap(path => path.commands).filter(command => command.kind === 'arc')).toEqual(
      expect.arrayContaining([expect.objectContaining({ radius: 7 })]),
    );
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 24, height: 14 });
    expect(result.scene.layout).toEqual({ x: 0, y: 0, width: 24, height: 14 });
  });

  it('仅裁剪具有圆形边界的内容，同时保留编写的外部裁剪', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'clipped-surface',
      child: node,
      overflow: 'clip',
      cornerRadius: 4,
      background: { fill: '#fff' },
      border: { stroke: '#000' },
      clip: { kind: 'rect', params: { x: 1, y: 1, width: 18, height: 8 } },
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [surfaceDefinition],
        clips: [pathClipDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'clipped-surface');
    const content = root?.children.find((child): child is GroupPrimitive => child.type === 'group');
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

  it('应用完整的外部 Scope 身份并转换一次，同时保持内部风格继承', () => {
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      id: 'styled-surface',
      child: node,
      border: { stroke: '#000' },
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
      defaults: {
        path: {
          style: { strokeWidth: 3 },
        },
      },
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [surface] },
      {
        composites: [surfaceDefinition],
        clips: [pathClipDefinition],
        padding: 0,
      },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'styled-surface');
    const border = pathsOf(root?.children ?? []).find(path => path.stroke !== undefined);

    expect(root).toMatchObject({
      id: 'styled-surface',
      meta: { owner: 'standard' },
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
    });
    expect(root?.animations).toHaveLength(1);
    expect(border?.strokeWidth).toBe(3);
    expect(result.scene.layout).toEqual({ x: 10, y: 20, width: 20, height: 10 });
  });

  it('使高 z 子级在背景层和边框层之间保持隔离', () => {
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
      { composites: [surfaceDefinition], padding: 0 },
    );
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'isolated-surface');

    expect(root?.children.map(child => child.type)).toEqual(['path', 'group', 'path']);

    const content = root?.children[1];

    expect(content?.type).toBe('group');

    if (content?.type === 'group') expect(content.children.length).toBeGreaterThan(0);
  });

  it('为退化子分配发出有限的圆形裁剪几何形状', () => {
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
        composites: [surfaceDefinition],
        clips: [pathClipDefinition],
        padding: 0,
      },
    );
    const clip = (result.scene.resources ?? []).find(resource => resource.kind === 'clip');

    expect(clip?.path).toMatchObject({ fillRule: 'nonzero', commands: expect.any(Array) });

    if (clip !== undefined) expect(JSON.stringify(clip.path.commands)).not.toMatch(/NaN|Infinity/);
  });
});
