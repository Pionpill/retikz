import type { ClipDefinition, IRScene, PathCommand } from '@retikz/core';

import { compileToScene, defineClip } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  CircleClipDefinition,
  CircleClipShapeDefinition,
  CompoundClipDefinition,
  CompoundClipProvider,
  CompoundClipSchema,
  CompoundClipShapeDefinition,
  CompoundClipShapeProvider,
  EllipseClipDefinition,
  EllipseClipShapeDefinition,
  PathClipDefinition,
  PathClipShapeDefinition,
  PolygonClipDefinition,
  PolygonClipShapeDefinition,
} from '../../src/clip';

const roundedRectClip = (): ClipDefinition =>
  defineClip({
    kind: 'roundedRect',
    schema: z.strictObject({
      kind: z.literal('roundedRect'),
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      radius: z.number().positive(),
    }),
    resolve: spec => {
      const commands: Array<PathCommand> = [
        { kind: 'move', to: [spec.x, spec.y] },
        { kind: 'line', to: [spec.x + spec.width, spec.y] },
        { kind: 'line', to: [spec.x + spec.width, spec.y + spec.height] },
        { kind: 'close' },
      ];
      return { kind: 'path', commands };
    },
  });

describe('Standard compound clip definition', () => {
  it('provides polygon and path definitions as explicit Standard extensions', () => {
    expect(PolygonClipDefinition.kind).toBe('polygon');
    expect(PathClipDefinition.kind).toBe('path');
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: {
            kind: 'polygon',
            points: [
              [0, 0],
              [20, 0],
              [10, 20],
            ],
          },
          children: [],
        },
      ],
    };
    expect(() =>
      compileToScene(scene, {
        clips: [PolygonClipDefinition],
        clipShapes: [PolygonClipShapeDefinition],
      }),
    ).not.toThrow();
  });

  it('parses recursive compound children and delegates a custom child to Core registry resolution', () => {
    const clip = CompoundClipSchema.parse({
      kind: 'compound',
      fillRule: 'evenodd',
      children: [
        { kind: 'circle', cx: 20, cy: 20, r: 10 },
        { kind: 'compound', children: [{ kind: 'ellipse', cx: 20, cy: 20, rx: 8, ry: 6 }] },
        { kind: 'roundedRect', x: 0, y: 0, width: 40, height: 40, radius: 4 },
      ],
    });
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'scope', clip, children: [] }],
    };

    const compiled = compileToScene(scene, {
      clips: [CompoundClipDefinition, CircleClipDefinition, EllipseClipDefinition, roundedRectClip()],
      clipShapes: [
        CompoundClipShapeDefinition,
        CircleClipShapeDefinition,
        EllipseClipShapeDefinition,
        PathClipShapeDefinition,
      ],
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

  it('keeps the compound provider closed by its shape dependency', () => {
    expect(CompoundClipProvider.makeDefinition({})).toBe(CompoundClipDefinition);
    expect(CompoundClipProvider.dependencies).toEqual([CompoundClipShapeProvider.key]);
  });

  it('requires a third-party child shape to be present in the active shape registry', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: {
            kind: 'compound',
            children: [{ kind: 'roundedRect', x: 0, y: 0, width: 40, height: 40, radius: 4 }],
          },
          children: [],
        },
      ],
    };

    expect(() =>
      compileToScene(scene, {
        clips: [CompoundClipDefinition, roundedRectClip()],
        clipShapes: [CompoundClipShapeDefinition],
      }),
    ).toThrow(/Unknown clip shape 'path'.*options\.clipShapes/i);
  });

  it('reports the Standard compound schema diagnostic before compile when children are empty', () => {
    expect(() => CompoundClipSchema.parse({ kind: 'compound', children: [] })).toThrow(/children/i);
  });

  it('requires the Compound definition to be explicitly injected into Core clip resolution', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: { kind: 'compound', children: [{ kind: 'circle', cx: 20, cy: 20, r: 10 }] },
          children: [],
        },
      ],
    };

    expect(() => compileToScene(scene)).toThrow(/Unknown clip 'compound'.*options\.clips/i);
  });
});
