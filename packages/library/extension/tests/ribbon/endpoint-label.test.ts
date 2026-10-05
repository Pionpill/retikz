import type { AnyPathKindDefinition, IRBoundaryLabel, IRScene, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import {
  createRibbonPathKindDefinition,
  defineRibbonCap,
  RibbonPathKindDefinition,
  RibbonPathOptionsSchema,
} from '../../src/ribbon';

const textsOf = (items: ReadonlyArray<ScenePrimitive>): Array<string> =>
  items.flatMap(item =>
    item.type === 'group' ? textsOf(item.children) : item.type === 'text' ? item.lines.map(line => line.text) : [],
  );

describe('Ribbon endpoint labels', () => {
  it('accepts Kernel rotation modes and rejects centerline-only fields', () => {
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

  it('emits both endpoint labels alongside a centerline label', () => {
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
              start: { label: { text: 'source' } },
              end: { label: { text: ['target', 'detail'], rotate: 30 } },
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
            label: { text: 'flow', placement: 'inside' },
          },
        ],
      },
      { pathKinds: [RibbonPathKindDefinition] },
    ).scene;

    expect(textsOf(scene.primitives)).toEqual(expect.arrayContaining(['source', 'target', 'detail', 'flow']));
  });
});

const labeledScene = (
  cap: { name: string; params?: Record<string, number | Array<number>> },
  label: IRBoundaryLabel = { text: 'endpoint' },
  definition: AnyPathKindDefinition = RibbonPathKindDefinition,
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
    { pathKinds: [definition], padding: 0, measureText: () => ({ width: 40, height: 20 }) },
  ).scene;

describe('Endpoint label cap clearance', () => {
  it.each([
    { name: 'butt', right: 144 },
    { name: 'square', right: 154 },
    { name: 'round', right: 154 },
  ])('places text beyond the complete $name cap', ({ name, right }) => {
    const scene = labeledScene({ name });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(right, 2);
  });

  it('accounts for projected text size after independent rotation', () => {
    const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', rotate: 'tangent' });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(124, 2);
  });

  it('uses the true quadratic cap extremum, not its control point', () => {
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
      createRibbonPathKindDefinition({ caps: [custom] }),
    );

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(164, 2);
  });

  it('keeps inside labels on the inward side without expanding the end', () => {
    const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', placement: 'inside' });

    expect(scene.layout.x + scene.layout.width).toBeCloseTo(100, 2);
  });
});

const allPrimitives = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? [item, ...allPrimitives(item.children)] : [item]));

it('keeps numeric rotations readable without changing the projected clearance', () => {
  const scene = labeledScene({ name: 'butt' }, { text: 'endpoint', rotate: 180, keepUpright: true });

  expect(scene.layout.x + scene.layout.width).toBeCloseTo(144, 2);

  const angles = allPrimitives(scene.primitives).flatMap(p =>
    p.type === 'group' ? (p.transforms?.filter(t => t.kind === 'rotate').map(t => t.degrees) ?? []) : [],
  );

  expect(angles).toContain(360);
});
it('measures rotated multiline blocks rather than a single line', () => {
  const scene = labeledScene({ name: 'butt' }, { text: ['first', 'second'], rotate: 'tangent', font: { size: 20 } });

  expect(scene.layout.x + scene.layout.width).toBeCloseTo(152, 2);
});
it('places both labels at zero-width butt caps and preserves parent transforms', () => {
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
    pathKinds: [RibbonPathKindDefinition],
    padding: 0,
    measureText: () => ({ width: 40, height: 20 }),
  });

  expect(textsOf(result.scene.primitives)).toEqual(['start', 'end']);
  expect(result.scene.layout.x).toBeCloseTo(-14, 2);
  expect(result.scene.layout.y).toBeCloseTo(30, 2);
  expect(result.scene.layout.width).toBeCloseTo(188, 2);
});

it('inherits Kernel label font and color, multiplies opacity, and retains host metadata', () => {
  const input: IRScene = {
    version: 1,
    type: 'scene',
    children: [
      {
        type: 'scope',
        defaults: {
          label: { textColor: 'blue', font: { size: 18, weight: 'bold' } },
          path: { style: { opacity: 0.5 } },
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
  const scene = compileToScene(input, { pathKinds: [RibbonPathKindDefinition] }).scene;
  const primitives = allPrimitives(scene.primitives);
  const text = primitives.find(p => p.type === 'text');

  expect(text).toMatchObject({ fill: 'blue', fontSize: 18, fontWeight: 'bold', opacity: 0.2 });
  expect(primitives.some(p => p.type === 'group' && p.meta?.source === 'connection')).toBe(true);
});
it('uses the specified endpoint section for radial rotation and tangent alignment', () => {
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
    { pathKinds: [RibbonPathKindDefinition] },
  ).scene;
  const angles = allPrimitives(scene.primitives).flatMap(p =>
    p.type === 'group' ? (p.transforms?.filter(t => t.kind === 'rotate').map(t => t.degrees) ?? []) : [],
  );

  expect(angles).toContain(-45);
});

it('uses arc cap extrema for rich text labels', () => {
  const scene = labeledScene(
    { name: 'arc', params: { center: [0, 0], radius: 10 } },
    { text: [{ runs: [{ text: 'rich', fill: 'red' }] }] },
  );

  expect(textsOf(scene.primitives)).toContain('rich');
  expect(scene.layout.x + scene.layout.width).toBeCloseTo(154, 2);
});

describe('Whole Ribbon transforms', () => {
  it.each([
    { rotate: 90, scale: undefined, x: 62, y: -72, width: 20, height: 144 },
    { rotate: undefined, scale: 2, x: -72, y: -20, width: 288, height: 40 },
    { rotate: 90, scale: { x: 2, y: 3 }, x: 42, y: -144, width: 60, height: 288 },
  ])('transforms outline and endpoint label together: $rotate / $scale', ({ rotate, scale, ...expected }) => {
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
            rotate,
            scale,
            kindOptions: { width: { kind: 'fixed', value: 20 }, end: { label: { text: 'target' } } },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ],
      },
      { pathKinds: [RibbonPathKindDefinition], padding: 0, measureText: () => ({ width: 40, height: 20 }) },
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
