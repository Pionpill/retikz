import type { IRPathBase } from '@retikz/core';

import { PathKind } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { InputNode, InputPath, InputScene } from '../../src';

import { normalizeNode, normalizePath, normalizeScene } from '../../src';

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
      kind: PathKind.Ribbon,
      ribbon: {
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
