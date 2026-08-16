import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ClipDefinition, ClipResource, ClipShape, IRClip, IRClipFillRule, IRScene, PathCommand } from '../../src';

import { compileToScene, defineClip, defineClipShape, PathCommandSchema } from '../../src';

type TestPathClipShape = ClipShape & {
  kind: 'testPathShape';
  commands: Array<PathCommand>;
  fillRule?: IRClipFillRule;
};

const TestPathClipShapeSchema: z.ZodType<TestPathClipShape> = z.strictObject({
  kind: z.literal('testPathShape'),
  commands: z.array(PathCommandSchema),
  fillRule: z.enum(['nonzero', 'evenodd']).optional(),
});

const TestPathClipShapeDefinition = defineClipShape<TestPathClipShape>({
  kind: 'testPathShape',
  schema: TestPathClipShapeSchema,
  lower: shape => ({ commands: shape.commands, fillRule: shape.fillRule ?? 'nonzero' }),
});

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

const pathOperation = (kind: string, commands: Array<PathCommand>, fillRule?: IRClipFillRule): ClipDefinition =>
  defineClip({
    kind,
    schema: z.strictObject({ kind: z.literal(kind) }),
    resolve: () => {
      const shape: TestPathClipShape = {
        kind: 'testPathShape',
        commands,
        ...(fillRule === undefined ? {} : { fillRule }),
      };
      return shape;
    },
  });

const compilePath = (
  commands: Array<PathCommand>,
  options: Readonly<{ fillRule?: IRClipFillRule; precision?: number }> = {},
): ClipResource['path'] => {
  const kind = 'testPath';
  const scene = compileToScene(clippedIr({ kind }), {
    clips: [pathOperation(kind, commands, options.fillRule)],
    clipShapes: [TestPathClipShapeDefinition],
    ...(options.precision === undefined ? {} : { precision: options.precision }),
  }).scene;
  const resource = (scene.resources ?? []).find(entry => entry.kind === 'clip');
  if (resource?.kind !== 'clip') throw new Error('Expected one clip resource.');
  return resource.path;
};

describe('canonical SceneClipPath', () => {
  it('defaults fillRule, rebuilds stable field order, rounds precision, and removes negative zero', () => {
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

  it('deduplicates canonical geometry when authored object key order differs', () => {
    const commandsA = [{ to: [0, 0], kind: 'move' } as PathCommand, { to: [4, 2], kind: 'line' } as PathCommand];
    const commandsB = [{ kind: 'move', to: [0, 0] } as PathCommand, { kind: 'line', to: [4, 2] } as PathCommand];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'scope', clip: { kind: 'pathA' }, children: [{ type: 'node', position: [0, 0], text: 'A' }] },
        { type: 'scope', clip: { kind: 'pathB' }, children: [{ type: 'node', position: [10, 0], text: 'B' }] },
      ],
    };

    const scene = compileToScene(ir, {
      clips: [pathOperation('pathA', commandsA), pathOperation('pathB', commandsB)],
      clipShapes: [TestPathClipShapeDefinition],
    }).scene;

    expect((scene.resources ?? []).filter(entry => entry.kind === 'clip')).toHaveLength(1);
  });

  it.each([
    { name: 'move only', commands: [{ kind: 'move', to: [0, 0] }] },
    { name: 'move then close only', commands: [{ kind: 'move', to: [0, 0] }, { kind: 'close' }] },
  ] satisfies Array<{ name: string; commands: Array<PathCommand> }>)(
    'rejects a path with no drawing segment: $name',
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
    'rejects $name without an active subpath',
    ({ commands }) => {
      expect(() => compilePath(commands)).toThrow(/active subpath/i);
    },
  );

  it('allows an arc to establish a subpath and preserves a legal open path', () => {
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
  ] satisfies Array<PathCommand>)('rejects a $kind radius that precision would collapse to zero', command => {
    expect(() => compilePath([command], { precision: 2 })).toThrow(/greater than 0/i);
  });
});
