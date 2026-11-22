import type { IRPathBase } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { InputNode, InputPath, InputScene } from '../../src';
import { normalizeNode, normalizePath, normalizeScene } from '../../src';

describe('Vanilla 输入标准化器', () => {
  it.each(['->', '<-', '<->'] as const)('箭头简写 %s 与显式端点对象等价，保留 marks', arrow => {
    const endpoints = arrow === '->' ? { end: {} } : arrow === '<-' ? { start: {} } : { start: {}, end: {} };
    const input: InputPath = {
      type: 'path',
      arrow,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
      marks: [{ pos: 1, shape: 'circle' }],
    };
    const expected = normalizePath({ ...input, arrow: endpoints });
    expect(normalizePath(input)).toEqual(expected);
    expect(normalizeScene({ type: 'scene', children: [input] }).ir.children[0]).toEqual(expected);
    expect(
      normalizeScene({ type: 'scene', children: [{ type: 'scope', children: [input] }] }).ir.children[0],
    ).toMatchObject({
      children: [expected],
    });
  });
  it('省略 Node position 时保留稀疏 Source', () => {
    expect(normalizeNode({ type: 'node', id: 'origin' })).toStrictEqual({ type: 'node', id: 'origin' });
  });

  it('将 typed Node 输入收敛为唯一 Source IR', () => {
    const input: InputNode = {
      type: 'node',
      id: 'source',
      position: [0, 0],
      label: { text: 'source', position: { side: 'top', fraction: 0 } },
    };

    expect(normalizeNode(input)).toEqual({
      type: 'node',
      id: 'source',
      position: [0, 0],
      label: { text: 'source', position: { side: 'top', fraction: 0 } },
    });
  });

  it('保留 InputNode 相对定位中的作者侧方向值', () => {
    const node: InputNode = {
      type: 'node',
      id: 'target',
      position: { direction: 'top', of: 'source' },
    };

    expect(normalizeNode(node)).toEqual({ type: 'node', id: 'target', position: { direction: 'top', of: 'source' } });
  });

  it('将 way 收敛为 Path Source IR，并保留显式零线宽', () => {
    const input: InputPath = {
      type: 'path',
      id: 'edge',
      way: [
        [0, 0],
        [24, 0],
      ],
      style: { strokeWidth: 0 },
    };

    expect(normalizePath(input)).toEqual({
      type: 'path',
      id: 'edge',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [24, 0] },
      ],
      style: { strokeWidth: 0 },
    });
  });

  it('把共享箭头重叠比例与逐端覆盖映射到对应 endpoint placement', () => {
    const input = {
      type: 'path',
      way: [
        [0, 0],
        [24, 0],
      ],
      arrow: { start: { endpointOverlap: 0 }, end: { endpointOverlap: 1 } },
    } satisfies InputPath;

    expect(normalizePath(input)).toMatchObject({
      arrow: { start: { endpointOverlap: 0 }, end: { endpointOverlap: 1 } },
    });
  });

  it('只把顶层共享值写到实际创建的箭头端点', () => {
    const input = {
      type: 'path',
      way: [
        [0, 0],
        [24, 0],
      ],
      arrow: { end: { endpointOverlap: 0.5 } },
    } satisfies InputPath;

    expect(normalizePath(input).arrow).toEqual({ end: { endpointOverlap: 0.5 } });
  });

  it('将 typed Step 的字符串 target 收敛为 Core Path step', () => {
    const input: InputPath = {
      type: 'path',
      id: 'edge',
      children: [
        { type: 'step', kind: 'move', to: 'source.center' },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: 'target.bottom', label: { text: 'flow' } },
      ],
    };

    expect(normalizePath(input)).toEqual({
      type: 'path',
      id: 'edge',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source', anchor: 'center' } },
        {
          type: 'step',
          kind: 'axis-line',
          axis: 'horizontal',
          to: { id: 'target', anchor: 'bottom' },
          label: { text: 'flow' },
        },
      ],
    });
  });

  it('显式首步保留曲线及控制点，只转换目标简写', () => {
    expect(
      normalizePath({
        type: 'path',
        children: [
          { type: 'step', kind: 'curve', control: [3, 5], to: 'source' },
          { type: 'step', kind: 'line', to: 'target' },
        ],
      }),
    ).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'curve', control: [3, 5], to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
  });

  it('单步路径只展开目标简写，几何诊断由 Core 处理', () => {
    expect(
      normalizePath({
        type: 'path',
        authoring: 'trace',
        children: [{ type: 'step', kind: 'fold', via: '-|-', fraction: 0.3, to: 'A' }],
      }),
    ).toEqual({ type: 'path', children: [{ type: 'step', kind: 'fold', via: '-|-', fraction: 0.3, to: { id: 'A' } }] });
  });

  it('允许单个自包含 rectangle 步骤', () => {
    expect(
      normalizePath({
        type: 'path',
        children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 10] }],
      }),
    ).toMatchObject({
      children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 10] }],
    });
  });

  it('将 InputScene 的 children 简写收敛为 IR', () => {
    const input: InputScene = { type: 'scene', children: [{ type: 'node', id: 'node', position: [0, 0] }] };

    expect(normalizeScene(input)).toMatchObject({
      ir: {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'node', position: [0, 0] }],
      },
      contributions: [],
    });
  });

  it('保留不含 children 的 boundary ribbon Source IR，不将其误作 InputPath', () => {
    const path: IRPathBase = {
      type: 'path',
      id: 'band',
      kind: 'ribbon',
      kindOptions: {
        mode: 'boundary',
        upper: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [20, 0] },
        ],
        lower: [
          { type: 'step', kind: 'move', to: [0, 10] },
          { type: 'step', kind: 'line', to: [20, 10] },
        ],
      },
    };
    const input: InputScene = { type: 'scene', children: [path] };

    expect(normalizeScene(input).ir.children).toEqual(input.children);
  });
});
