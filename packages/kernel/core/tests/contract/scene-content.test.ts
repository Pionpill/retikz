import { describe, expect, it } from 'vitest';

import type { GroupPrimitive, Scene, SceneContentVisitContext } from '../../src';
import { RetikzCoreError, RetikzCoreErrorCode, visitSceneContent } from '../../src';

describe('Scene 内容遍历契约', () => {
  it('共享 Pattern 在每个使用处保留宿主、资源标记和路径', () => {
    const motif = { type: 'rect' as const, id: 'local', x: 0, y: 0, width: 1, height: 1 };
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: ['A', 'B'].map(id => ({
        type: 'rect',
        id,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        fill: { kind: 'resourceRef', id: 'tile' },
      })),
      resources: [
        { kind: 'paint', id: 'tile', spec: { kind: 'pattern', shape: 'dots' }, tile: { size: 10, motif: [motif] } },
      ],
    };
    const sites: Array<SceneContentVisitContext> = [];

    expect(() => visitSceneContent(scene)).not.toThrow();
    visitSceneContent(scene, (primitive, context) => {
      if (primitive === motif) sites.push(context);
    });

    expect(sites).toEqual([
      { hostId: 'A', isResourceContent: true, scenePath: 'primitives[0].fill.resource(tile).motif[0]' },
      { hostId: 'B', isResourceContent: true, scenePath: 'primitives[1].fill.resource(tile).motif[0]' },
    ]);
    expect(motif.id).toBe('local');
  });

  it('拒绝重复资源 ID 而不采用静默覆盖', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [],
      resources: [
        { kind: 'clip', id: 'duplicate', path: { commands: [], fillRule: 'nonzero' } },
        { kind: 'clip', id: 'duplicate', path: { commands: [], fillRule: 'evenodd' } },
      ],
    };

    expect(() => visitSceneContent(scene)).toThrow(
      expect.objectContaining({
        constructor: RetikzCoreError,
        code: RetikzCoreErrorCode.Compile,
        message: expect.stringContaining('resources.duplicate'),
      }),
    );
  });
  it('拒绝丢失和错误类型的资源引用及其使用路径', () => {
    const scene: Scene = {
      layout: { x: 0, y: 0, width: 10, height: 10 },
      primitives: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: { kind: 'resourceRef', id: 'missing' } }],
    };
    expect(() => visitSceneContent(scene)).toThrow(/primitives\[0\].fill.*missing/);
    scene.resources = [{ kind: 'clip', id: 'missing', path: { fillRule: 'nonzero', commands: [] } }];
    expect(() => visitSceneContent(scene)).toThrow(/expected paint resource/);
  });

  it('拒绝循环模式依赖性和循环组对象', () => {
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

  it('访问每个宿主的共享内容，而不将重用视为循环', () => {
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
