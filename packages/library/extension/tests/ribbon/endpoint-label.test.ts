import type { AnyPathDefinition, IRBoundaryLabel, IRScene, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import {
  createRibbonPathDefinition,
  defineRibbonCap,
  ribbonPathDefinition,
  RibbonPathOptionsSchema,
} from '../../src/ribbon';

const textsOf = (items: ReadonlyArray<ScenePrimitive>): Array<string> =>
  items.flatMap(item =>
    item.type === 'group' ? textsOf(item.children) : item.type === 'text' ? item.lines.map(line => line.text) : [],
  );

describe('功能区端点标签', () => {
  it('接受内核旋转模式并拒绝仅中心线字段', () => {
    const width = { kind: 'fixed', value: 20 };

    expect(
      RibbonPathOptionsSchema.safeParse({
        width,
        start: { label: { text: 'source', rotate: 'tangent', keepUpright: true } },
      }).success,
    ).toBe(true);
    expect(
      RibbonPathOptionsSchema.safeParse({ width, start: { label: { text: 'source', sloped: true } } }).success,
    ).toBe(false);
  });

  it('在中心线标签旁边发出两个端点标签', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            kindOptions: {
              label: { text: 'flow', placement: 'inside' },
              width: { kind: 'fixed', value: 20 },
              start: { label: { text: 'source' } },
              end: { label: { text: ['target', 'detail'], rotate: 30 } },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      },
      { paths: [ribbonPathDefinition] },
    ).scene;

    expect(textsOf(scene.primitives)).toEqual(expect.arrayContaining(['source', 'target', 'detail', 'flow']));
  });
});

const labeledScene = (
  cap: { name: string; params?: Record<string, number | Array<number>> },
  label: IRBoundaryLabel = { text: 'endpoint' },
  definition: AnyPathDefinition = ribbonPathDefinition,
) =>
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: { width: { kind: 'fixed', value: 20 }, end: { cap, label } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    },
    { paths: [definition], padding: 0, measureText: () => ({ width: 40, height: 20 }) },
  ).scene;

describe('端点标签盖间隙', () => {
  it.each([
    { name: 'butt', right: 144 },
    { name: 'square', right: 154 },
    { name: 'round', right: 154 },
  ])('将文本放置在完整的 $name 端帽之外', ({ name, right }) => {
    const scene = labeledScene({ name });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(right, 2);
  });

  it('考虑独立旋转后的投影文本大小', () => {
    const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', rotate: 'tangent' });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(124, 2);
  });

  it('使用二次曲线端帽的实际极值而非控制点', () => {
    const custom = defineRibbonCap({
      name: 'curved',
      paramsSchema: strictObject({}),
      resolve: ctx => ({
        extension: 0,
        commands: [
          { kind: 'move', to: [ctx.center[0], ctx.center[1] + 10] },
          { kind: 'quad', control: [ctx.center[0] + 40, ctx.center[1]], to: [ctx.center[0], ctx.center[1] - 10] },
        ],
      }),
    });
    const scene = labeledScene(
      { name: 'curved' },
      { text: 'endpoint' },
      createRibbonPathDefinition({ caps: [custom] }),
    );

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(164, 2);
  });

  it('将内部标签保留在内侧，而不扩展末端', () => {
    const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', placement: 'inside' });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(100, 2);
  });
});

const allPrimitives = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? [item, ...allPrimitives(item.children)] : [item]));

it('在不改变预计间隙的情况下保持数字旋转的可读性', () => {
  const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', rotate: 180, keepUpright: true });

  expect(scene.layout.x + scene.layout.width).toBeCloseTo(144, 2);

  const angles = allPrimitives(scene.primitives).flatMap(p =>
    p.type === 'group' ? (p.transforms?.filter(t => t.kind === 'rotate').map(t => t.degrees) ?? []) : [],
  );

  expect(angles).toContain(360);
});
it('测量旋转的多行块而不是单行', () => {
  const scene = labeledScene({ name: 'butt' }, { text: ['first', 'second'], rotate: 'tangent', font: { size: 20 } });

  expect(scene.layout.x + scene.layout.width).toBeCloseTo(152, 2);
});
it('将两个标签放置在零宽度对接大写处并保留父变换', () => {
  const input: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 30, y: 40 }],
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            kindOptions: {
              width: { kind: 'fixed', value: 0 },
              start: { label: { text: 'start', rotate: 'radial', keepUpright: true } },
              end: { label: { text: 'end' } },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      },
    ],
  };
  const restored = JSON.parse(JSON.stringify(input));
  const result = compileToScene(restored, {
    paths: [ribbonPathDefinition],
    padding: 0,
    measureText: () => ({ width: 40, height: 20 }),
  });

  expect(textsOf(result.scene.primitives)).toEqual(['start', 'end']);
  expect(result.scene.layout.x).toBeCloseTo(-14, 2);
  expect(result.scene.layout.y).toBeCloseTo(30, 2);
  expect(result.scene.layout.width).toBeCloseTo(188, 2);
});

it('继承内核标签字体和颜色，倍增不透明度，并保留宿主元数据', () => {
  const input: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'scope',
        defaults: {
          node: { label: { textColor: 'blue', font: { size: 18, weight: 'bold' } } },
          path: { style: { opacity: 0.5 }, label: { textColor: 'blue', font: { size: 18, weight: 'bold' } } },
        },
        children: [
          {
            type: 'path',
            kind: 'ribbon',
            meta: { source: 'connection' },
            kindOptions: { width: { kind: 'fixed', value: 20 }, end: { label: { text: 'target', opacity: 0.4 } } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      },
    ],
  };
  const scene = compileToScene(input, { paths: [ribbonPathDefinition] }).scene;
  const primitives = allPrimitives(scene.primitives);
  const text = primitives.find(p => p.type === 'text');

  expect(text).toMatchObject({ fill: 'blue', fontSize: 18, fontWeight: 'bold', opacity: 0.2 });
  expect(primitives.some(p => p.type === 'group' && p.meta?.source === 'connection')).toBe(true);
});
it('使用指定的端点截面进行径向旋转和切线对齐', () => {
  const scene = compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          kind: 'ribbon',
          kindOptions: {
            width: { kind: 'fixed', value: 20 },
            end: { direction: 45, label: { text: 'angled', rotate: 'radial', align: 'start' } },
          },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    },
    { paths: [ribbonPathDefinition] },
  ).scene;
  const angles = allPrimitives(scene.primitives).flatMap(p =>
    p.type === 'group' ? (p.transforms?.filter(t => t.kind === 'rotate').map(t => t.degrees) ?? []) : [],
  );

  expect(angles).toContain(-45);
});

it('对富文本标签使用圆弧帽极值', () => {
  const scene = labeledScene(
    { name: 'arc', params: { center: [0, 0], radius: 10 } },
    { text: [{ segments: [{ text: 'rich', fill: 'red' }] }] },
  );

  expect(textsOf(scene.primitives)).toContain('rich');
  expect(scene.layout.x + scene.layout.width).toBeCloseTo(154, 2);
});

describe('整个功能区变换', () => {
  it.each([
    { rotate: 90, scale: undefined, x: 62, y: -72, width: 20, height: 144 },
    { rotate: undefined, scale: 2, x: -72, y: -20, width: 288, height: 40 },
    { rotate: 90, scale: { x: 2, y: 3 }, x: 42, y: -144, width: 60, height: 288 },
  ])('将轮廓和端点标签一起变换：$rotate / $scale', ({ rotate, scale, ...expected }) => {
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            id: 'ribbon',
            meta: { owner: 'connection' },
            kind: 'ribbon',
            ...(rotate === undefined ? {} : { rotate }),
            ...(scale === undefined ? {} : { scale }),
            kindOptions: { width: { kind: 'fixed', value: 20 }, end: { label: { text: 'target' } } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      },
      { paths: [ribbonPathDefinition], padding: 0, measureText: () => ({ width: 40, height: 20 }) },
    );

    for (const key of ['x', 'y', 'width', 'height'] as const)
      expect(result.scene.layout[key]).toBeCloseTo(expected[key], 2);
    const group = result.scene.primitives[0];

    expect(group).toMatchObject({ type: 'group', id: 'ribbon', meta: { owner: 'connection' } });

    if (group.type === 'group') {
      expect(textsOf(group.children)).toContain('target');
      expect(group.children.some(p => p.type === 'path')).toBe(true);
    }
  });
});
