import type { GroupPrimitive, SceneClipPath, SceneResource } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { buildPrim } from '../../../src/svg';
import { renderClipDefs } from './resource-fixtures';

const clipPathsOf = (resources: Array<SceneResource>): Array<SvgNode> => {
  return renderClipDefs({ resources, idFor: (id: string) => `c-${id}` });
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

describe('renderClipDefs — canonical SceneClipPath 物化', () => {
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

    expect(clipPath.tag).toBe('clipPath');
    expect(clipPath.attrs.id).toBe('c-clip-1');

    const path = (Array.isArray(clipPath.children) ? clipPath.children[0] : clipPath.children) as SvgNode;

    expect(path.tag).toBe('path');
    expect(path.attrs.d).toBe('M 0 0 L 40 0 L 40 40 Z');
    expect(path.attrs['clip-rule']).toBe('evenodd');
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

    expect(paths.map(path => path.attrs.id)).toEqual(['c-clip-1', 'c-clip-2']);
  });
});

describe('buildPrim — GroupPrimitive.clipRef → <g 裁剪路径>', () => {
  const groupWithClip = (clipRef?: string): GroupPrimitive => ({
    type: 'group',
    clipRef,
    children: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: 'red' }],
  });

  it('通过 clipRefUrl 物化引用', () => {
    const element = buildPrim(groupWithClip('clip-1'), {
      clipRefUrl: (id: string) => `url(#C-${id})`,
    });

    expect(element.attrs['clip-path']).toBe('url(#C-clip-1)');
  });

  it('缺省 resolver 使用原始 resource id', () => {
    const element = buildPrim(groupWithClip('clip-2'));

    expect(element.attrs['clip-path']).toBe('url(#clip-2)');
  });

  it('无 clipRef 时不设置 clipPath', () => {
    const element = buildPrim(groupWithClip());

    expect(element.attrs['clip-path']).toBeUndefined();
  });
});
