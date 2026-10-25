import { describe, expect, it } from 'vitest';

import { compileToScene, definePattern, visitSceneContent } from '../../src';
import type { TextPrimitive, Scene, GroupPrimitive } from '../../src';
import {
  createClipRegistry,
  createPaintRegistry,
  importSceneResources,
  remapPrimitiveResources,
} from '../../src/compile/resource';

describe('资源内容复用基础图元', () => {
  it('自定义 Pattern 保留已度量文本和基础图元样式', () => {
    const text: TextPrimitive = {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'A' }],
      fontSize: 8,
      lineHeight: 8,
      measuredWidth: 5,
      measuredHeight: 8,
      align: 'start',
      baseline: 'top',
      fill: 'red',
    };
    const pattern = definePattern({ name: 'textTile', emit: () => [text] });
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', position: [0, 0], style: { fill: { kind: 'pattern', shape: 'textTile' } } }],
      },
      { patterns: [pattern] },
    );
    const resource = result.scene.resources?.find(item => item.kind === 'paint' && 'tile' in item);
    expect(resource?.tile.motif).toEqual([text]);
    expect(resource?.tile.motif[0]).not.toBe(text);
  });
});

describe('Scene resource dependency closure', () => {
  it('资源依赖失败时不向目标注册表发布部分内容', () => {
    const paint = createPaintRegistry(value => value);
    const clip = createClipRegistry(value => value);
    const resources: NonNullable<Scene['resources']> = [
      { kind: 'clip', id: 'window', path: { fillRule: 'nonzero', commands: [] } },
      {
        kind: 'paint',
        id: 'tile',
        spec: { kind: 'pattern', shape: 'custom' },
        tile: {
          size: 10,
          motif: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: { kind: 'resourceRef', id: 'tile' } }],
        },
      },
    ];
    expect(() => importSceneResources(resources, paint, clip)).toThrow(/cyclic/);
    expect(paint.resources()).toEqual([]);
    expect(clip.resources()).toEqual([]);
  });
  it('重映射 Pattern 与嵌套箭头引用，保留相同 spec 的不同内容', () => {
    const resources: NonNullable<Scene['resources']> = [
      {
        kind: 'paint',
        id: 'outer',
        spec: { kind: 'pattern', shape: 'custom' },
        tile: {
          size: 10,
          motif: [
            {
              type: 'group',
              clipRef: 'window',
              children: [
                { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: { kind: 'resourceRef', id: 'inner' } },
              ],
            },
          ],
        },
      },
      {
        kind: 'paint',
        id: 'inner',
        spec: { kind: 'pattern', shape: 'custom' },
        tile: { size: 10, motif: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }] },
      },
      { kind: 'clip', id: 'window', path: { fillRule: 'nonzero', commands: [] } },
    ];
    const paint = createPaintRegistry(value => value);
    const clip = createClipRegistry(value => value);
    const ids = importSceneResources(resources, paint, clip);
    expect(ids.get('outer')).not.toBe(ids.get('inner'));
    const host = remapPrimitiveResources(
      {
        type: 'path',
        id: 'host',
        commands: [],
        arrowEnd: {
          shape: 'test',
          baseSize: 10,
          refX: 0,
          markerWidth: 10,
          markerHeight: 10,
          marker: [
            {
              type: 'rect',
              id: 'local',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              fill: { kind: 'resourceRef', id: 'outer' },
            },
          ],
        },
      },
      ids,
    );
    const owners: Array<string | undefined> = [];
    visitSceneContent({ primitives: [host], resources: [...paint.resources(), ...clip.resources()] }, (_, site) =>
      owners.push(site.hostId),
    );
    expect(owners).toEqual(['host', 'host', 'host', 'host', 'host']);
    expect(resources[0].id).toBe('outer');
  });
  it('rejects missing and wrong-kind resource references with their use path', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: { kind: 'resourceRef', id: 'missing' } }],
    };
    expect(() => visitSceneContent(scene)).toThrow(/primitives\[0\].fill.*missing/);
    scene.resources = [{ kind: 'clip', id: 'missing', path: { fillRule: 'nonzero', commands: [] } }];
    expect(() => visitSceneContent(scene)).toThrow(/expected paint resource/);
  });
  it('rejects cyclic Pattern dependencies and cyclic group objects', () => {
    const primitive = {
      type: 'rect' as const,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fill: { kind: 'resourceRef' as const, id: 'tile' },
    };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [primitive],
      resources: [
        { kind: 'paint', id: 'tile', spec: { kind: 'pattern', shape: 'dots' }, tile: { size: 10, motif: [primitive] } },
      ],
    };
    expect(() => visitSceneContent(scene)).toThrow(/cyclic/);
    const group: GroupPrimitive = { type: 'group', children: [] };
    group.children.push(group);
    expect(() => visitSceneContent({ primitives: [group] })).toThrow(/cyclic/);
  });
  it('visits shared content per host without treating reuse as a cycle', () => {
    const content = { type: 'rect' as const, id: 'local', x: 0, y: 0, width: 1, height: 1 };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: ['A', 'B'].map(id => ({
        type: 'path',
        id,
        commands: [],
        arrowEnd: { shape: 'test', baseSize: 10, refX: 10, markerWidth: 10, markerHeight: 10, marker: [content] },
      })),
    };
    const owners: Array<string | undefined> = [];
    const scenePaths: Array<string> = [];
    visitSceneContent(scene, (_, site) => {
      if (site.isResourceContent) {
        owners.push(site.hostId);
        scenePaths.push(site.scenePath);
      }
    });
    expect(owners).toEqual(['A', 'B']);
    expect(scenePaths).toEqual(['primitives[0].arrowEnd.marker[0]', 'primitives[1].arrowEnd.marker[0]']);
    expect(content.id).toBe('local');
  });
});
