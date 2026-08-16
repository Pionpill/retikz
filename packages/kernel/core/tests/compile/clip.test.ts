import { describe, expect, it } from 'vitest';

import type { ClipResource, GroupPrim, IRPaint, IRScene, ScenePrimitive, SceneResource } from '../../src';

import { compileToScene } from '../../src/compile/compile';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

/** 顶层第一个 GroupPrim（scope 对应的 group） */
const firstGroup = (primitives: ReadonlyArray<ScenePrimitive>): GroupPrim | undefined =>
  primitives.find((p): p is GroupPrim => p.type === 'group');

/** 从 Scene.resources 取所有 clip 资源 */
const clipResources = (resources: Array<SceneResource> | undefined): Array<ClipResource> =>
  (resources ?? []).filter((r): r is ClipResource => r.kind === 'clip');

const grad: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

describe('clip 资源生成 + GroupPrim.clipRef 挂载', () => {
  it('rect clip → resources 含 canonical path，scope GroupPrim.clipRef 指向它', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({
      kind: 'clip',
      path: {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [40, 0] },
          { kind: 'line', to: [40, 30] },
          { kind: 'line', to: [0, 30] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    });
    const group = firstGroup(compiled.primitives);
    expect(group?.clipRef).toBe(clips[0].id);
  });

  it('clip 资源 id 用 clip-N 命名空间', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    expect(clipResources(compiled.resources)[0].id).toBe('clip-1');
  });
});

describe('clip 去重 / 不同 clip 各自资源', () => {
  it('两 scope 用结构相同 clip → 1 条 clip 资源、两 GroupPrim 同 clipRef', () => {
    const sameClip = { kind: 'rect', x: 0, y: 0, width: 40, height: 30 } as const;
    const ir = scene([
      {
        type: 'scope',
        clip: sameClip,
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: sameClip,
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    const groups = compiled.primitives.filter((p): p is GroupPrim => p.type === 'group');
    expect(groups).toHaveLength(2);
    expect(groups[0].clipRef).toBe(clips[0].id);
    expect(groups[1].clipRef).toBe(clips[0].id);
  });

  it('两 scope 用不同 clip → 2 条 clip 资源、各自 id', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 5, y: 5, width: 20, height: 15 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(2);
    expect(new Set(clips.map(c => c.id)).size).toBe(2);
    const groups = compiled.primitives.filter((p): p is GroupPrim => p.type === 'group');
    expect(groups[0].clipRef).not.toBe(groups[1].clipRef);
  });
});

describe('带 clip 的 scope 不被 prune', () => {
  it('无 transforms / 无 id 但带 clip 的 scope 仍产 GroupPrim 且携 clipRef', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 60, height: 60 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const group = firstGroup(compiled.primitives);
    expect(group).toBeDefined();
    expect(group?.transforms).toBeUndefined();
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
  });

  it('空 children 但带 clip 的 scope 仍产 GroupPrim（保留 clip 语义）', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 20, height: 20 },
        children: [],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const group = firstGroup(compiled.primitives);
    expect(group).toBeDefined();
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
  });
});

describe('交互：paint + clip 资源共存 / transformed scope path ownership', () => {
  it('同 scene 既有 paint 又有 clip 资源 → 两类共存、id 命名空间不撞（paint-N / clip-N）', () => {
    const ir = scene([
      { type: 'node', id: 'G', position: [0, 0], text: 'G', fill: grad },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
        children: [{ type: 'node', id: 'A', position: [80, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const paints = (compiled.resources ?? []).filter(r => r.kind === 'paint');
    const clips = clipResources(compiled.resources);
    expect(paints).toHaveLength(1);
    expect(clips).toHaveLength(1);
    expect(paints[0].id).toBe('paint-1');
    expect(clips[0].id).toBe('clip-1');
    const allIds = (compiled.resources ?? []).map(r => r.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('带 transforms 的 scope 内 path 留在该 scope GroupPrim 并受 clip 约束', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 100, height: 100 },
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [30, 0], text: 'B' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'line', to: { id: 'B' } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const topPath = compiled.primitives.find(p => p.type === 'path');
    expect(topPath).toBeUndefined();
    const group = firstGroup(compiled.primitives);
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
    const innerPath = group?.children.find(c => c.type === 'path');
    expect(innerPath).toBeDefined();
  });

  it('无 transforms 的 scope 内 path 留在 GroupPrim 内（正常被裁）', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 100, height: 100 },
        children: [
          { type: 'node', id: 'A', position: [0, 0], text: 'A' },
          { type: 'node', id: 'B', position: [30, 0], text: 'B' },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'A' } },
              { type: 'step', kind: 'line', to: { id: 'B' } },
            ],
          },
        ],
      },
    ]);
    const compiled = compileToScene(ir).scene;
    const group = firstGroup(compiled.primitives);
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
    // 无 transforms scope 内 path 留在 group.children（受 clipRef 裁剪）
    const innerPath = group?.children.find(c => c.type === 'path');
    expect(innerPath).toBeDefined();
  });
});

describe('退化裁剪区手搓 IR 编译期守卫', () => {
  it('rect width = Infinity（绕过 schema）→ 编译期抛，不泄漏进 Scene', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: Infinity, height: 10 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    expect(() => compileToScene(ir).scene).toThrow();
  });

  it('rect height = NaN（绕过 schema）→ 编译期抛', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 10, height: NaN },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    expect(() => compileToScene(ir).scene).toThrow();
  });

  it('polygon 仅 2 点（绕过 schema）→ 编译期抛', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: {
          kind: 'polygon',
          points: [
            [0, 0],
            [10, 0],
          ],
        },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    expect(() => compileToScene(ir).scene).toThrow();
  });
});
