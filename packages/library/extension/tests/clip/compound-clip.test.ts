import type { ClipDefinition, IRScene, PathCommand } from '@retikz/core';
import { compileToScene, defineClip } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import {
  circleClipDefinition,
  compoundClipDefinition,
  compoundClipProvider,
  CompoundClipSchema,
  ellipseClipDefinition,
  pathClipDefinition,
  polygonClipDefinition,
} from '../../src/clip';

const roundedRectClip = (): ClipDefinition =>
  defineClip({
    kind: 'roundedRect',
    schema: strictObject({
      kind: literal('roundedRect'),
      params: strictObject({
        x: number(),
        y: number(),
        width: number().positive(),
        height: number().positive(),
        radius: number().positive(),
      }),
    }),

    lower: spec => {
      const commands: Array<PathCommand> = [
        { kind: 'move', to: [spec.params.x, spec.params.y] },
        { kind: 'line', to: [spec.params.x + spec.params.width, spec.params.y] },
        { kind: 'line', to: [spec.params.x + spec.params.width, spec.params.y + spec.params.height] },
        { kind: 'close' },
      ];
      {
        const params = { commands };
        return { commands: params.commands, fillRule: 'nonzero' };
      }
    },
  });

describe('扩展复合裁剪定义', () => {
  it('提供多边形和路径定义作为显式扩展扩展', () => {
    expect(polygonClipDefinition.kind).toBe('polygon');
    expect(pathClipDefinition.kind).toBe('path');

    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: {
            kind: 'polygon',
            params: {
              points: [
                [0, 0],
                [20, 0],
                [10, 20],
              ],
            },
          },
          children: [],
        },
      ],
    };

    expect(() => compileToScene(scene, { clips: [polygonClipDefinition] })).not.toThrow();
  });

  it('解析递归复合子项并将自定义子项委托给 Core 注册表解析', () => {
    const clip = CompoundClipSchema.parse({
      kind: 'compound',
      params: {
        fillRule: 'evenodd',
        children: [
          { kind: 'circle', params: { cx: 20, cy: 20, r: 10 } },
          { kind: 'compound', params: { children: [{ kind: 'ellipse', params: { cx: 20, cy: 20, rx: 8, ry: 6 } }] } },
          { kind: 'roundedRect', params: { x: 0, y: 0, width: 40, height: 40, radius: 4 } },
        ],
      },
    });
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'scope', clip, children: [] }],
    };

    const compiled = compileToScene(scene, {
      clips: [compoundClipDefinition, circleClipDefinition, ellipseClipDefinition, roundedRectClip()],
    }).scene;
    const resource = compiled.resources?.[0];

    expect(resource).toMatchObject({ kind: 'clip', path: { fillRule: 'evenodd' } });

    if (resource?.kind !== 'clip') throw new Error('Expected canonical clip resource');

    expect(resource.path.commands.map(command => command.kind)).toEqual([
      'move',
      'arc',
      'close',
      'move',
      'ellipseArc',
      'close',
      'move',
      'line',
      'line',
      'close',
    ]);
  });

  it('具体化一种完整的复合定义，无需形状依赖性', () => {
    expect(compoundClipProvider.makeDefinition([])).toBe(compoundClipDefinition);
    expect(compoundClipProvider.dependencies ?? []).toEqual([]);
  });

  it('要求活动裁剪注册表中存在第三方子定义', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: {
            kind: 'compound',
            params: {
              children: [{ kind: 'roundedRect', params: { x: 0, y: 0, width: 40, height: 40, radius: 4 } }],
            },
          },
          children: [],
        },
      ],
    };

    expect(() =>
      compileToScene(scene, {
        clips: [compoundClipDefinition, roundedRectClip()],
      }),
    ).not.toThrow();

    expect(() => compileToScene(scene, { clips: [compoundClipDefinition] })).toThrow(
      /Unknown provider 'roundedRect'.*available:/i,
    );
  });

  it('当子项为空时，在编译前报告扩展复合 schema 诊断', () => {
    expect(() => CompoundClipSchema.parse({ kind: 'compound', params: { children: [] } })).toThrow(/children/i);
  });

  it('要求将复合定义显式注入到 Core 裁剪解析结果中', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: { kind: 'compound', params: { children: [{ kind: 'circle', params: { cx: 20, cy: 20, r: 10 } }] } },
          children: [],
        },
      ],
    };

    expect(() => compileToScene(scene)).toThrow(/Unknown provider 'compound'.*available:/i);
  });
});
