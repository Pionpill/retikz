import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ClipDefinition, ClipShape, IRClip, IRScene, PathCommand } from '../../src';

import { compileToScene, defineClip } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

const customOperation = (kind: string, shape: ClipShape) =>
  defineClip({
    kind,
    schema: z.strictObject({ kind: z.literal(kind) }),
    resolve: () => shape,
  });

const rectCommands: Array<PathCommand> = [
  { kind: 'move', to: [1, 2] },
  { kind: 'line', to: [4, 2] },
  { kind: 'line', to: [4, 6] },
  { kind: 'line', to: [1, 6] },
  { kind: 'close' },
];

describe('builtin ClipShape definitions', () => {
  const cases: Array<{
    name: string;
    clip: IRClip;
    clips: ReadonlyArray<ClipDefinition> | undefined;
    commands: Array<PathCommand>;
    fillRule: 'nonzero' | 'evenodd';
  }> = [
    {
      name: 'rect',
      clip: { kind: 'rect', x: 1, y: 2, width: 3, height: 4 } satisfies IRClip,
      clips: undefined,
      commands: rectCommands,
      fillRule: 'nonzero',
    },
    {
      name: 'circle',
      clip: { kind: 'circle', cx: 2, cy: 3, r: 4 } satisfies IRClip,
      clips: undefined,
      commands: [
        { kind: 'move', to: [6, 3] },
        { kind: 'arc', center: [2, 3], radius: 4, startAngle: 0, endAngle: 360 },
        { kind: 'close' },
      ] satisfies Array<PathCommand>,
      fillRule: 'nonzero',
    },
    {
      name: 'ellipse',
      clip: { kind: 'ellipse', cx: 2, cy: 3, rx: 4, ry: 5 } satisfies IRClip,
      clips: undefined,
      commands: [
        { kind: 'move', to: [6, 3] },
        { kind: 'ellipseArc', center: [2, 3], radiusX: 4, radiusY: 5, startAngle: 0, endAngle: 360 },
        { kind: 'close' },
      ] satisfies Array<PathCommand>,
      fillRule: 'nonzero',
    },
    {
      name: 'polygon',
      clip: { kind: 'polygonOp' } satisfies IRClip,
      clips: [
        customOperation('polygonOp', {
          kind: 'polygon',
          points: [
            [0, 0],
            [4, 0],
            [2, 3],
          ],
        }),
      ],
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [4, 0] },
        { kind: 'line', to: [2, 3] },
        { kind: 'close' },
      ] satisfies Array<PathCommand>,
      fillRule: 'nonzero',
    },
    {
      name: 'path',
      clip: { kind: 'pathOp' } satisfies IRClip,
      clips: [
        customOperation('pathOp', {
          kind: 'path',
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [3, 2] },
          ],
          fillRule: 'evenodd',
        }),
      ],
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [3, 2] },
      ] satisfies Array<PathCommand>,
      fillRule: 'evenodd',
    },
    {
      name: 'compound',
      clip: { kind: 'compoundOp' } satisfies IRClip,
      clips: [
        customOperation('compoundOp', {
          kind: 'compound',
          children: [
            { kind: 'rect', x: 1, y: 2, width: 3, height: 4 },
            {
              kind: 'path',
              commands: [
                { kind: 'move', to: [8, 8] },
                { kind: 'line', to: [9, 9] },
              ],
              fillRule: 'nonzero',
            },
          ],
          fillRule: 'evenodd',
        }),
      ],
      commands: [
        ...rectCommands,
        { kind: 'move', to: [8, 8] },
        { kind: 'line', to: [9, 9] },
      ] satisfies Array<PathCommand>,
      fillRule: 'evenodd',
    },
  ];

  it.each(cases)('lowers $name through the builtin shape registry', ({ clip, clips, commands, fillRule }) => {
    const scene = compileToScene(clippedIr(clip), { ...(clips === undefined ? {} : { clips }) }).scene;

    expect(scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: { commands, fillRule },
      },
    ]);
  });

  it.each([
    { kind: 'circle', cx: 0.006, cy: 0.004, r: 0.006 },
    { kind: 'ellipse', cx: 0.006, cy: 0.004, rx: 0.006, ry: 1 },
  ] satisfies Array<IRClip>)('keeps the rounded $kind move aligned with its arc start', clip => {
    const resource = compileToScene(clippedIr(clip), { precision: 2 }).scene.resources?.[0];
    if (resource?.kind !== 'clip') throw new Error('Expected a clip resource.');
    const [move, arc] = resource.path.commands;
    if (move.kind !== 'move' || (arc.kind !== 'arc' && arc.kind !== 'ellipseArc')) {
      throw new Error('Expected move and arc commands.');
    }
    const radiusX = arc.kind === 'arc' ? arc.radius : arc.radiusX;
    expect(move.to).toEqual([arc.center[0] + radiusX, arc.center[1]]);
  });
});
