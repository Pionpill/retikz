import type { GroupPrim, SceneClipPath, SceneResource } from '@retikz/core';

import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { ClipDefs, renderPrim } from '../../../src/render/svg';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

const clipPathsOf = (resources: Array<SceneResource>): Array<AnyEl> => {
  const fragment = ClipDefs({ resources, idFor: (id: string) => `c-${id}` }) as AnyEl;
  return (fragment.props.children as Array<AnyEl>).filter(Boolean);
};

const clipResource = (id: string, path: SceneClipPath): SceneResource => ({ kind: 'clip', id, path });

const rectPath = (width: number, height: number): SceneClipPath => ({
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [width, 0] },
    { kind: 'line', to: [width, height] },
    { kind: 'line', to: [0, height] },
    { kind: 'close' },
  ],
  fillRule: 'nonzero',
});

describe('ClipDefs — canonical SceneClipPath 物化', () => {
  it('每个 clip resource 固定物化为一个 <clipPath><path/></clipPath>', () => {
    const [clipPath] = clipPathsOf([
      clipResource('clip-1', {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [40, 0] },
          { kind: 'line', to: [40, 40] },
          { kind: 'close' },
        ],
        fillRule: 'evenodd',
      }),
    ]);

    expect(clipPath.type).toBe('clipPath');
    expect(clipPath.props.id).toBe('c-clip-1');
    const path = (
      Array.isArray(clipPath.props.children) ? clipPath.props.children[0] : clipPath.props.children
    ) as AnyEl;
    expect(path.type).toBe('path');
    expect(path.props.d).toBe('M 0 0 L 40 0 L 40 40 Z');
    expect(path.props.clipRule).toBe('evenodd');
  });

  it('多 clip 保持顺序并忽略 paint resource', () => {
    const paths = clipPathsOf([
      clipResource('clip-1', rectPath(10, 10)),
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          kind: 'linearGradient',
          stops: [
            { offset: 0, color: '#000' },
            { offset: 1, color: '#fff' },
          ],
        },
      },
      clipResource('clip-2', rectPath(5, 5)),
    ]);

    expect(paths.map(path => path.props.id)).toEqual(['c-clip-1', 'c-clip-2']);
  });
});

describe('renderPrim — GroupPrim.clipRef → <g clip-path>', () => {
  const groupWithClip = (clipRef?: string): GroupPrim => ({
    type: 'group',
    clipRef,
    children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }],
  });

  it('通过 clipRefUrl 物化引用', () => {
    const element = renderPrim(groupWithClip('clip-1'), 0, {
      clipRefUrl: (id: string) => `url(#C-${id})`,
    }) as AnyEl;
    expect(element.props.clipPath).toBe('url(#C-clip-1)');
  });

  it('缺省 resolver 使用原始 resource id', () => {
    const element = renderPrim(groupWithClip('clip-2'), 0) as AnyEl;
    expect(element.props.clipPath).toBe('url(#clip-2)');
  });

  it('无 clipRef 时不设置 clipPath', () => {
    const element = renderPrim(groupWithClip(), 0) as AnyEl;
    expect(element.props.clipPath).toBeUndefined();
  });
});
