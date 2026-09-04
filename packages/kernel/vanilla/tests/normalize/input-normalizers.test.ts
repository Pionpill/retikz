import type { IRPathBase } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { InputNode, InputPath, InputScene } from '../../src';

import { InputPathArrowDirection, normalizeNode, normalizePath, normalizeScene } from '../../src';

describe('Vanilla Input normalizers', () => {
  it('将 typed Node 输入收敛为唯一 Source IR', () => {
    const input: InputNode = {
      id: 'source',
      position: [0, 0],
      label: { text: 'source', position: { boundary: 'top', fraction: 0 } },
    };

    expect(normalizeNode(input)).toEqual({
      type: 'node',
      id: 'source',
      position: [0, 0],
      label: { text: 'source', position: { boundary: 'top', fraction: 0 } },
    });
  });

  it('保留 InputNode 相对定位中的作者侧方向值', () => {
    const node: InputNode = {
      id: 'target',
      position: { direction: 'top', of: 'source' },
    };

    expect(normalizeNode(node)).toEqual({ type: 'node', id: 'target', position: { direction: 'top', of: 'source' } });
  });

  it('将 way 与 thickness 收敛为 Path Source IR，并保留显式零线宽', () => {
    const input: InputPath = {
      id: 'edge',
      way: [
        [0, 0],
        [24, 0],
      ],
      thickness: 'thick',
      strokeWidth: 0,
    };

    expect(normalizePath(input)).toEqual({
      type: 'path',
      id: 'edge',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [24, 0] },
      ],
      strokeWidth: 0,
    });
  });

  it('路径箭头方向使用公开 const object enum 表达', () => {
    expect(InputPathArrowDirection).toEqual({ None: 'none', Forward: '->', Backward: '<-', Both: '<->' });
  });

  it('把共享箭头重叠比例与逐端覆盖映射到对应 endpoint placement', () => {
    const input = {
      way: [
        [0, 0],
        [24, 0],
      ],
      arrow: '<->',
      arrowPlacement: {
        overlap: 0.5,
        start: { overlap: 0 },
        end: { overlap: 1 },
      },
    } satisfies InputPath & { arrowPlacement: unknown };

    expect(normalizePath(input)).toMatchObject({
      marks: [
        { pos: 0, endpointOverlap: 0, mark: { kind: 'arrow' } },
        { pos: 1, endpointOverlap: 1, mark: { kind: 'arrow' } },
      ],
    });
  });

  it('只把顶层共享值写到实际创建的箭头端点', () => {
    const input = {
      way: [
        [0, 0],
        [24, 0],
      ],
      arrow: '->',
      arrowPlacement: { overlap: 0.5 },
    } satisfies InputPath & { arrowPlacement: unknown };

    expect(normalizePath(input).marks).toEqual([{ pos: 1, endpointOverlap: 0.5, mark: { kind: 'arrow' } }]);
  });

  it.each([
    { arrow: undefined, arrowPlacement: {}, expected: 'requires arrow' },
    { arrow: 'none' as const, arrowPlacement: { overlap: 0.5 }, expected: 'requires arrow' },
    { arrow: '->' as const, arrowPlacement: { start: { overlap: 0.5 } }, expected: 'start requires a start arrow' },
    { arrow: '<-' as const, arrowPlacement: { end: { overlap: 0.5 } }, expected: 'end requires an end arrow' },
  ])('拒绝没有对应箭头端点的 placement：$expected', ({ arrow, arrowPlacement, expected }) => {
    const input = {
      way: [
        [0, 0],
        [24, 0],
      ],
      ...(arrow === undefined ? {} : { arrow }),
      arrowPlacement,
    } satisfies InputPath & { arrowPlacement: unknown };

    expect(() => normalizePath(input)).toThrow(expected);
  });

  it('将 typed Step 的字符串 target 收敛为 Core Path step', () => {
    const input: InputPath = {
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

  it('将首个可定位步骤收敛为 move，保留后续绘制步骤', () => {
    expect(
      normalizePath({
        type: 'path',
        children: [
          { type: 'step', kind: 'line', to: 'source' },
          { type: 'step', kind: 'line', to: 'target' },
        ],
      }),
    ).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
  });

  it('拒绝不足两个步骤的非自包含路径', () => {
    expect(() =>
      normalizePath({
        type: 'path',
        children: [{ type: 'step', kind: 'move', to: [0, 0] }],
      }),
    ).toThrow('path requires at least 2 steps');
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

  it('将 InputScene 的 children 简写收敛为 IR 与默认 Layer metadata', () => {
    const input: InputScene = {
      children: [{ id: 'node', position: [0, 0] }],
    };

    expect(normalizeScene(input)).toMatchObject({
      ir: {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'node', position: [0, 0] }],
      },
      contributions: [],
      runtimeMeta: {
        layers: [{ id: 'default', cache: 'auto', order: 0, zIndex: 0, childIds: ['node'] }],
      },
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
    const input: InputScene = { children: [path] };

    expect(normalizeScene(input).ir.children).toEqual(input.children);
  });
});
