import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { ClipDefinition, ClipResource, IRClip, ClipFillRule, IRScene, PathCommand } from '../../src';
import { compileToScene, defineClip } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

const pathOperation = (kind: string, commands: Array<PathCommand>, fillRule?: ClipFillRule): ClipDefinition =>
  defineClip({
    kind,
    schema: strictObject({ kind: literal(kind), params: strictObject({}) }),

    lower: () => ({ commands, fillRule: fillRule ?? 'nonzero' }),
  });

const compilePath = (
  commands: Array<PathCommand>,
  options: Readonly<{ fillRule?: ClipFillRule; precision?: number }> = {},
): ClipResource['path'] => {
  const kind = 'testPath';
  const scene = compileToScene(clippedIr({ kind, params: {} }), {
    clips: [pathOperation(kind, commands, options.fillRule)],
    ...(options.precision === undefined ? {} : { precision: options.precision }),
  }).scene;
  const resource = (scene.resources ?? []).find(entry => entry.kind === 'clip');
  if (resource?.kind !== 'clip') throw new Error('Expected one clip resource.');

  return resource.path;
};

describe('规范的 SceneClipPath', () => {
  it('补全 fillRule 默认值、固定字段顺序、舍入精度并消除负零', () => {
    const path = compilePath(
      [
        { to: [-0.001, -0.004], kind: 'move' },
        { to: [1.234, 2.346], control: [0.555, 0.666], kind: 'quad' },
      ],
      { precision: 2 },
    );

    expect(path).toEqual({
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'quad', control: [0.56, 0.67], to: [1.23, 2.35] },
      ],
      fillRule: 'nonzero',
    });
    expect(Object.keys(path)).toEqual(['commands', 'fillRule']);
    expect(Object.keys(path.commands[1])).toEqual(['kind', 'control', 'to']);
    expect(Object.is(path.commands[0].kind === 'move' ? path.commands[0].to[0] : undefined, -0)).toBe(false);
  });

  it('当编写的对象键顺序不同时，对规范几何进行去重', () => {
    const commandsA = [{ to: [0, 0], kind: 'move' } as PathCommand, { to: [4, 2], kind: 'line' } as PathCommand];
    const commandsB = [{ kind: 'move', to: [0, 0] } as PathCommand, { kind: 'line', to: [4, 2] } as PathCommand];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          clip: { kind: 'pathA', params: {} },
          children: [{ type: 'node', position: [0, 0], text: 'A' }],
        },
        {
          type: 'scope',
          clip: { kind: 'pathB', params: {} },
          children: [{ type: 'node', position: [10, 0], text: 'B' }],
        },
      ],
    };

    const scene = compileToScene(ir, {
      clips: [pathOperation('pathA', commandsA), pathOperation('pathB', commandsB)],
    }).scene;

    expect((scene.resources ?? []).filter(entry => entry.kind === 'clip')).toHaveLength(1);
  });

  it.each([
    { name: 'move only', commands: [{ kind: 'move', to: [0, 0] }] },
    { name: 'move then close only', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'close' }] },
  ] satisfies Array<{ name: string; commands: Array<PathCommand> }>)(
    '拒绝没有绘图段的路径：$name',
    ({ commands }) => {
      expect(() => compilePath(commands)).toThrow(/drawing segment/i);
    },
  );

  it.each([
    { name: 'line', commands: [{ kind: 'line', to: [1, 1] }] },
    { name: 'quad', commands: [{ kind: 'quad', control: [1, 0], to: [2, 1] }] },
    {
      name: 'cubic',
      commands: [{ kind: 'cubic', control1: [1, 0], control2: [2, 1], to: [3, 0] }],
    },
    { name: 'close', commands: [{ kind: 'close' }] },
    {
      name: 'line after close',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [1, 1] },
        { kind: 'close' },
        { kind: 'line', to: [2, 2] },
      ],
    },
  ] satisfies Array<{ name: string; commands: Array<PathCommand> }>)(
    '拒绝没有活动子路径的 $name',
    ({ commands }) => {
      expect(() => compilePath(commands)).toThrow(/active subpath/i);
    },
  );

  it('允许弧建立子路径并保留合法的开放路径', () => {
    const path = compilePath([
      { kind: 'arc', center: [0, 0], radius: 2, startAngle: 0, endAngle: 90 },
      { kind: 'line', to: [3, 3] },
    ]);

    expect(path.commands).toEqual([
      { kind: 'arc', center: [0, 0], radius: 2, startAngle: 0, endAngle: 90 },
      { kind: 'line', to: [3, 3] },
    ]);
    expect(path.commands.at(-1)?.kind).not.toBe('close');
  });

  it.each([
    { kind: 'arc', center: [0, 0], radius: 0.004, startAngle: 0, endAngle: 360 },
    { kind: 'ellipseArc', center: [0, 0], radiusX: 0.004, radiusY: 1, startAngle: 0, endAngle: 360 },
  ] satisfies Array<PathCommand>)('拒绝按精度舍入后变为零的 $kind 半径', command => {
    expect(() => compilePath([command], { precision: 2 })).toThrow(/greater than 0/i);
  });
});
