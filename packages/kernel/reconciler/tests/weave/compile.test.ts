import type { IRScene, ScenePrimitive } from '@retikz/core';
import { compileSceneSnapshot, compileToScene, definePath, PathSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { readWeaveCurrent, WeaveReconciler } from '../../src/weave';

const scene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: 'b' } },
      ],
    },
    { type: 'scope', position: [20, 10], children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }] },
    { type: 'scope', position: [120, 50], children: [{ type: 'coordinate', id: 'b', position: [0, 0] }] },
  ],
};

describe('Weave 编译构建', () => {
  it('保留跨 Scope 延后路径、声明结构和完整来源', () => {
    const prepared = new WeaveReconciler(scene).mount();
    expect(prepared.compilation.result).toEqual(compileToScene(scene));
    expect(prepared.root.pending).toBeNull();
    expect(readWeaveCurrent(prepared.root).children.every(node => node.pending === null)).toBe(true);
    expect(readWeaveCurrent(prepared.root).children.map(node => node.type)).toEqual(['path', 'scope', 'scope']);
    expect(readWeaveCurrent(prepared.root).scopeIds.size).toBe(3);
    expect(readWeaveCurrent(prepared.root).children.every(node => readWeaveCurrent(node).compiled !== null)).toBe(true);
    expect(prepared.compilation.provenance?.emissions.map(entry => entry.primitivePath)).toEqual(
      compileSceneSnapshot(scene, {}, { captureProvenance: true }).provenance?.emissions.map(
        entry => entry.primitivePath,
      ),
    );
    expect(readWeaveCurrent(readWeaveCurrent(prepared.root).children[0]).dependencies.size).toBe(2);
    expect(scene.children[1]).not.toHaveProperty('id');
  });

  it('失败的新候选不改变此前树、索引和已完成输出', () => {
    const previous = new WeaveReconciler(scene).mount();
    const output = JSON.stringify(previous.compilation.result);
    const nodes = [...readWeaveCurrent(previous.root).scopeIds.values()];
    expect(() =>
      new WeaveReconciler({
        ...scene,
        children: [{ type: 'coordinate', id: 'bad', position: { direction: 'right', of: 'absent' } }],
      }).mount(),
    ).toThrow();
    expect(JSON.stringify(previous.compilation.result)).toBe(output);
    expect([...readWeaveCurrent(previous.root).scopeIds.values()]).toEqual(nodes);
  });

  it('Scope 局部名称与匿名包络使用 Core 规则', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'node', id: 'a', position: [0, 0] },
        {
          type: 'scope',
          id: 'outer',
          children: [
            {
              type: 'scope',
              localNamespace: true,
              children: [
                { type: 'node', id: 'a', position: [50, 20] },
                {
                  type: 'path',
                  children: [
                    { type: 'step', kind: 'move', to: { id: 'a' } },
                    { type: 'step', kind: 'line', to: [80, 20] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(new WeaveReconciler(input).mount().compilation.result).toEqual(compileToScene(input));
  });
});

describe('Weave 与 Core 可观察等价', () => {
  const inputs: Array<IRScene> = [
    {
      type: 'scene',
      version: 1,
      children: [
        { type: 'node', id: 'same', position: [0, 0] },
        { type: 'node', id: 'same', position: [80, 20] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'same' } },
            { type: 'step', kind: 'line', to: [0, 0] },
          ],
        },
      ],
    },
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 's',
          position: [30, 50],
          transforms: [{ kind: 'rotate', degrees: 30 }],
          children: [
            { type: 'node', id: 'a', aliasIds: ['alias'], position: [10, 20], text: 'A', zIndex: 2 },
            {
              type: 'path',
              zIndex: -1,
              children: [
                { type: 'step', kind: 'move', to: { id: 'alias' } },
                { type: 'step', kind: 'line', to: [80, 30] },
              ],
            },
          ],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 's' } },
            { type: 'step', kind: 'line', to: { id: 'a' } },
          ],
        },
      ],
    },
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          position: [30, 40],
          children: [
            { type: 'scope', position: [10, 20], children: [{ type: 'node', id: 'a', position: [5, 10] }] },
            { type: 'node', id: 'b', position: { direction: 'right', of: 'a' } },
          ],
        },
      ],
    },
    {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'missing' } },
            { type: 'step', kind: 'line', to: [10, 20] },
          ],
        },
      ],
    },
  ];
  it.each(inputs)('保持引用、变换、排序、诊断与发射归属', input => {
    const full = compileSceneSnapshot(input, {}, { captureProvenance: true });
    const weave = new WeaveReconciler(input, {}).mount().compilation;
    expect(weave.result).toEqual(full.result);
    expect(weave.diagnostics).toEqual(full.diagnostics);
    expect(
      weave.provenance?.emissions.map(({ primitivePath, role, ordinal }) => ({ primitivePath, role, ordinal })),
    ).toEqual(full.provenance?.emissions.map(({ primitivePath, role, ordinal }) => ({ primitivePath, role, ordinal })));
  });
});

it('嵌套旋转缩放后的引用、渐变资源与观察结果保持同版本', () => {
  const input: IRScene = {
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'scope',
        position: [50, 60],
        transforms: [{ kind: 'rotate', degrees: 25 }],
        children: [
          {
            type: 'scope',
            position: [15, 25],
            transforms: [{ kind: 'scale', x: 2, y: 3 }],
            children: [
              {
                type: 'node',
                id: 'a',
                position: [10, 30],
                text: 'A',
                style: {
                  fill: {
                    kind: 'linearGradient',
                    angle: 0,
                    stops: [
                      { offset: 0, color: 'red' },
                      { offset: 1, color: 'blue' },
                    ],
                  },
                },
              },
            ],
          },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'a' } },
              { type: 'step', kind: 'line', to: [80, 30] },
            ],
          },
        ],
      },
      {
        type: 'node',
        id: 'b',
        position: [150, 50],
        style: {
          fill: {
            kind: 'linearGradient',
            angle: 90,
            stops: [
              { offset: 0, color: 'yellow' },
              { offset: 1, color: 'green' },
            ],
          },
        },
      },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'a' } },
          { type: 'step', kind: 'line', to: { id: 'b' } },
        ],
      },
    ],
  };
  const full = compileSceneSnapshot(input, {});
  const weave = new WeaveReconciler(input, {}).mount().compilation;
  expect(weave.result).toEqual(full.result);
});

it('新环境的测量服务生效，空树不携带旧资源或读取记录', () => {
  const input: IRScene = {
    type: 'scene',
    version: 1,
    children: [{ type: 'node', id: 'a', text: 'A', position: [0, 0] }],
  };
  const first = new WeaveReconciler(input, { measureText: () => ({ width: 10, height: 10 }) }).mount();
  const second = new WeaveReconciler(input, { measureText: () => ({ width: 100, height: 10 }) }).mount();
  expect(second.compilation.result.scene.layout.width).toBeGreaterThan(first.compilation.result.scene.layout.width);
  expect(second.root.scopeId).not.toBe(first.root.scopeId);
  const empty = new WeaveReconciler({ ...input, children: [] }).mount();
  expect(readWeaveCurrent(empty.root).records.size).toBe(0);
  expect(readWeaveCurrent(empty.root).ids.size).toBe(0);
  expect(readWeaveCurrent(empty.root).scopeIds.size).toBe(1);
  expect(empty.compilation.result.scene.resources).toBeUndefined();
});

it('祖先 Scope 几何引用失败，未来声明不会提前对 Node 可见', () => {
  expect(() =>
    new WeaveReconciler({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 's',
          children: [{ type: 'coordinate', id: 'a', position: { direction: 'right', of: 's' } }],
        },
      ],
    }).mount(),
  ).toThrow(/ancestor Scope/);
  const input: IRScene = {
    type: 'scene',
    version: 1,
    children: [
      { type: 'node', id: 'a', position: { direction: 'right', of: 'future' } },
      { type: 'node', id: 'future', position: [100, 0] },
    ],
  };
  expect(() => compileSceneSnapshot(input)).toThrow(/Cannot resolve position/);
  expect(() => new WeaveReconciler(input).mount()).toThrow(/Cannot resolve position/);
});

it('自定义 Path 重用相同图元对象时保留各自的发射来源', () => {
  const primitive: ScenePrimitive = { type: 'rect', x: 0, y: 0, width: 10, height: 10 };
  const kind = definePath({
    name: 'shared-output',
    schema: PathSchema.extend({ kind: literal('shared-output') }),
    compile: () => ({
      primitives: [primitive],
      boundsPoints: [
        [0, 0],
        [10, 10],
      ],
    }),
  });
  const input: IRScene = {
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        kind: 'shared-output',
        id: 'a',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 10] },
        ],
      },
      {
        type: 'path',
        kind: 'shared-output',
        id: 'b',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 10] },
        ],
      },
    ],
  };
  const prepared = new WeaveReconciler(input, { paths: [kind] }).mount();
  expect(prepared.compilation.result).toEqual(compileToScene(input, { paths: [kind] }));
  const owners = prepared.compilation.provenance?.emissions.map(emission => emission.owner);
  expect(new Set(owners).size).toBe(2);
});
