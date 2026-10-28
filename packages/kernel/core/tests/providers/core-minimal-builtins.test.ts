import { describe, expect, it } from 'vitest';

import type { IRClip, IRScene } from '../../src';
import { BUILTIN_ARROWS, BUILTIN_CLIPS, BUILTIN_SHAPES, compileToScene } from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('Core 最小内置提供者', () => {
  it('仅保留基本形状、箭头和裁剪集合', () => {
    expect([...BUILTIN_SHAPES.values()].map(definition => definition.name)).toEqual([
      'rectangle',
      'ellipse',
      'polygon',
    ]);
    expect([...BUILTIN_ARROWS.values()].map(definition => definition.name)).toEqual([
      'normal',
      'open',
      'stealth',
      'openStealth',
      'circle',
      'openCircle',
    ]);
    expect([...BUILTIN_CLIPS.values()].map(definition => definition.kind)).toEqual(['rect']);
    expect(BUILTIN_CLIPS.get('rect')).toEqual(
      expect.objectContaining({
        kind: 'rect',
        schema: expect.anything(),
        lower: expect.any(Function),
      }),
    );
  });

  it('当 IR 命名可选提供者时，需要可选的 Standard 定义', () => {
    expect(() => compileToScene(scene([{ type: 'node', position: [0, 0], shape: 'cross' }]), { padding: 0 })).toThrow(
      /Unknown provider 'cross'.*available:/i,
    );

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'scope',
            clip: { kind: 'compound', params: { children: [{ kind: 'circle', params: { cx: 0, cy: 0, r: 10 } }] } },
            children: [],
          },
        ]),
        { padding: 0 },
      ),
    ).toThrow(/Unknown provider 'compound'.*available:/i);

    const optionalClips: Array<IRClip> = [
      {
        kind: 'polygon',
        params: {
          points: [
            [0, 0],
            [10, 0],
            [5, 10],
          ],
        },
      },
      { kind: 'path', params: { commands: [{ kind: 'move', to: [0, 0] }] } },
    ];

    for (const clip of optionalClips) {
      expect(() => compileToScene(scene([{ type: 'scope', clip, children: [] }]), { padding: 0 })).toThrow(
        new RegExp(`Unknown provider '${clip.kind}'.*available:`, 'i'),
      );
    }
  });

  it.each(['circle', 'ellipse'])('需要 %s 裁剪操作的可选定义', kind => {
    const clip: IRClip =
      kind === 'circle' ? { kind, params: { cx: 0, cy: 0, r: 10 } } : { kind, params: { cx: 0, cy: 0, rx: 10, ry: 5 } };

    expect(() => compileToScene(scene([{ type: 'scope', clip, children: [] }]), { padding: 0 })).toThrow(
      new RegExp(`Unknown provider '${kind}'.*available:`, 'i'),
    );
  });

  it('编译内置空心隐形箭头，无需注入定义', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            arrow: { end: { shape: 'openStealth' } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });

  it('编译内置空心三角形箭头，无需注入定义', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            arrow: { end: { shape: 'open' } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });

  it('编译内置圆形箭头，无需注入定义', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            arrow: { start: { shape: 'circle' }, end: { shape: 'openCircle' } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });
});
