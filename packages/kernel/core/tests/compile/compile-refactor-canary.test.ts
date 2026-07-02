import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileWarning, IR, IRAnimationTrack, PathCommand, Scene, ScenePrimitive } from '../../src';

import { compileToScene, definePathGenerator } from '../../src';
import { flattenPrims } from '../helpers/flatten';

const CAMERA: IRAnimationTrack = {
  property: 'viewBox',
  keyframes: [
    { at: 0, value: [-80, -60, 240, 180] },
    { at: 1, value: [-40, -30, 120, 90] },
  ],
  duration: 500,
};

const FADE: IRAnimationTrack = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 250,
};

const compileWithWarnings = (ir: IR): { scene: Scene; warnings: Array<CompileWarning> } => {
  const warnings: Array<CompileWarning> = [];
  const scene = compileToScene(ir, {
    onWarn: warning => warnings.push(warning),
    pathGenerators: [
      definePathGenerator({
        name: 'dogleg',
        paramsSchema: z.object({
          bend: z.object({ id: z.string() }),
        }),
        targetParams: ['bend'],
        generate: ({ from, to, resolvedTargets }) => {
          const bend = resolvedTargets.bend ?? from;
          const end = to ?? bend;
          return [
            { kind: 'line', to: bend },
            { kind: 'line', to: end },
          ] satisfies Array<PathCommand>;
        },
      }),
    ],
  });
  return { scene, warnings };
};

const primitiveTypes = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive['type']> =>
  flattenPrims(primitives).map(primitive => primitive.type);

describe('compile refactor canary', () => {
  it('keeps high-risk scene semantics stable across compile module moves', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      animations: [CAMERA, FADE],
      children: [
        {
          type: 'node',
          id: 'origin',
          position: [0, 0],
          text: 'Origin',
          zIndex: 2,
          meta: { canary: 'node' },
          animations: [FADE],
          fill: {
            kind: 'linearGradient',
            angle: 0,
            stops: [
              { offset: 0, color: '#f43f5e' },
              { offset: 1, color: '#0ea5e9' },
            ],
          },
          label: {
            text: 'pin',
            position: 'top',
            pin: { stroke: '#334155', strokeWidth: 1 },
          },
        },
        {
          type: 'scope',
          id: 'cluster',
          localNamespace: true,
          zIndex: 1,
          meta: { canary: 'scope' },
          transforms: [{ kind: 'translate', x: 40, y: 20 }],
          clip: { kind: 'rect', x: -30, y: -20, width: 80, height: 60 },
          children: [
            { type: 'node', id: 'origin', position: [0, 0], text: 'Inner' },
            { type: 'coordinate', id: 'bend', position: [20, 30] },
            {
              type: 'path',
              id: 'generated',
              zIndex: 3,
              rotate: 15,
              scale: { x: 1.2, y: 0.8 },
              meta: { canary: 'path' },
              animations: [FADE],
              stroke: '#475569',
              marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }],
              children: [
                { type: 'step', kind: 'move', to: { id: 'origin' } },
                {
                  type: 'step',
                  kind: 'generator',
                  name: 'dogleg',
                  to: [80, 40],
                  params: { bend: { id: 'bend' } },
                  label: { text: 'gen', position: 'midway', sloped: true },
                },
              ],
            },
            {
              type: 'path',
              id: 'band',
              kind: 'ribbon',
              ribbon: { mode: 'centerline', width: 8, samples: 3 },
              label: { text: 'flow', position: 'midway', placement: 'inside' },
              children: [
                { type: 'step', kind: 'move', to: [0, 50] },
                { type: 'step', kind: 'line', to: [80, 50] },
              ],
            },
          ],
        },
        {
          type: 'path',
          id: 'external-to-scope',
          zIndex: 4,
          children: [
            { type: 'step', kind: 'move', to: { id: 'origin' } },
            { type: 'step', kind: 'line', to: { id: 'cluster' }, label: { text: 'scope' } },
          ],
        },
      ],
    };

    const { scene, warnings } = compileWithWarnings(ir);
    const flat = flattenPrims(scene.primitives);

    expect(scene.animations).toEqual([CAMERA]);
    expect(warnings.map(warning => warning.code)).toEqual(['ANIMATION_INVALID_PROPERTY']);
    expect(scene.resources?.map(resource => resource.kind).sort()).toEqual(['clip', 'paint']);
    expect(primitiveTypes(scene.primitives)).toMatchInlineSnapshot(`
      [
        "path",
        "text",
        "group",
        "group",
        "rect",
        "text",
        "group",
        "rect",
        "text",
        "path",
        "text",
        "group",
        "path",
        "group",
        "text",
        "group",
        "path",
        "path",
        "text",
      ]
    `);
    expect(flat.some(primitive => primitive.id === 'generated')).toBe(true);
    expect(flat.some(primitive => primitive.type === 'path' && primitive.id === 'band')).toBe(true);
    expect(flat.some(primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'pin'))).toBe(
      true,
    );
    expect(
      flat.some(primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'flow')),
    ).toBe(true);
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene);
  });
});
