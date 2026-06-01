/**
 * clip 编译：Scope clip → ClipResource 资源 + GroupPrim.clipRef
 * @description `<Scope clip={...}>` 经 compileToScene 把裁剪区去重成 `{ kind:'clip', id, shape }` 进 Scene.resources，
 *   并给该 scope 的 GroupPrim 挂 clipRef 指向资源 id；相同 clip 去重为一条资源、不同 clip 各自资源；
 *   无 transforms / 无 id 但带 clip 的 scope 仍产 GroupPrim（不被 prune）；paint 与 clip 资源同表共存、id 命名空间不撞；
 *   带 transforms 的 scope 内 path 被 hoist 到顶层、不进 GroupPrim（既有架构限制）；手搓非 finite 裁剪区编译期抛。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { GroupPrim, IR, IRPaintSpec, ScenePrimitive, SceneResource } from '../../src';
import type { ClipResource } from '../../src';

const scene = (children: IR['children']): IR => ({
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

const grad: IRPaintSpec = {
  type: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#4f8' },
    { offset: 1, color: '#08f' },
  ],
};

describe('clip 资源生成 + GroupPrim.clipRef 挂载', () => {
  it('rect clip → resources 含 clip 资源，scope GroupPrim.clipRef 指向它', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0]).toMatchObject({
      kind: 'clip',
      shape: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
    });
    const group = firstGroup(compiled.primitives);
    expect(group?.clipRef).toBe(clips[0].id);
  });

  it('circle clip → resources 含 circle shape 资源，GroupPrim.clipRef 挂上', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'circle', cx: 0, cy: 0, r: 120 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0].shape).toMatchObject({ kind: 'circle', cx: 0, cy: 0, r: 120 });
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
    const compiled = compileToScene(ir);
    expect(clipResources(compiled.resources)[0].id).toBe('clip-1');
  });

  it('polygon clip（3 点）→ shape 携 points', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: {
          kind: 'polygon',
          points: [
            [0, 0],
            [40, 0],
            [20, 40],
          ],
        },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const clips = clipResources(compiled.resources);
    expect(clips).toHaveLength(1);
    expect(clips[0].shape).toMatchObject({
      kind: 'polygon',
      points: [
        [0, 0],
        [40, 0],
        [20, 40],
      ],
    });
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
    const compiled = compileToScene(ir);
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
        clip: { kind: 'circle', cx: 0, cy: 0, r: 50 },
        children: [{ type: 'node', id: 'B', position: [80, 0], text: 'B' }],
      },
    ]);
    const compiled = compileToScene(ir);
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
        clip: { kind: 'circle', cx: 0, cy: 0, r: 60 },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
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
    const compiled = compileToScene(ir);
    const group = firstGroup(compiled.primitives);
    expect(group).toBeDefined();
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
  });
});

describe('交互：paint + clip 资源共存 / transformed scope path hoist', () => {
  it('同 scene 既有 paint 又有 clip 资源 → 两类共存、id 命名空间不撞（paint-N / clip-N）', () => {
    const ir = scene([
      { type: 'node', id: 'G', position: [0, 0], text: 'G', fill: grad },
      {
        type: 'scope',
        clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 30 },
        children: [{ type: 'node', id: 'A', position: [80, 0], text: 'A' }],
      },
    ]);
    const compiled = compileToScene(ir);
    const paints = (compiled.resources ?? []).filter(r => r.kind === 'paint');
    const clips = clipResources(compiled.resources);
    expect(paints).toHaveLength(1);
    expect(clips).toHaveLength(1);
    expect(paints[0].id).toBe('paint-1');
    expect(clips[0].id).toBe('clip-1');
    const allIds = (compiled.resources ?? []).map(r => r.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('带 transforms 的 scope 内 path 被 hoist 到顶层、不进该 scope GroupPrim（既有限制）', () => {
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
    const compiled = compileToScene(ir);
    // path hoist 到顶层
    const topPath = compiled.primitives.find(p => p.type === 'path');
    expect(topPath).toBeDefined();
    // scope GroupPrim 内不含 path primitive（被 hoist）
    const group = firstGroup(compiled.primitives);
    expect(group?.clipRef).toBe(clipResources(compiled.resources)[0].id);
    const innerPath = group?.children.find(c => c.type === 'path');
    expect(innerPath).toBeUndefined();
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
    const compiled = compileToScene(ir);
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
    expect(() => compileToScene(ir)).toThrow();
  });

  it('circle r = NaN（绕过 schema）→ 编译期抛', () => {
    const ir = scene([
      {
        type: 'scope',
        clip: { kind: 'circle', cx: 0, cy: 0, r: NaN },
        children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
      },
    ]);
    expect(() => compileToScene(ir)).toThrow();
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
    expect(() => compileToScene(ir)).toThrow();
  });
});
