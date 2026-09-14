import { describe, expect, it } from 'vitest';

import type {
  ClipOwnerOutput,
  CompileObservation,
  CoordinateOwnerOutput,
  IRScene,
  NodeOwnerOutput,
  ScopeOwnerOutput,
} from '../../src';
import * as core from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const nodeOutput: NodeOwnerOutput = {
  rect: { x: 1, y: 2, width: 20, height: 10, rotate: 30 },
  shape: {
    name: 'ellipse',
    outline: [
      { kind: 'move', to: [10, 0] },
      { kind: 'ellipseArc', center: [0, 0], radiusX: 10, radiusY: 5, rotation: 30, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    keyPoints: [
      { name: 'center', position: [0, 0] },
      { name: 'major-east', position: [8.66, 5] },
    ],
  },
  boundary: {
    name: 'ellipse',
    outline: [
      { kind: 'move', to: [10, 0] },
      { kind: 'ellipseArc', center: [0, 0], radiusX: 10, radiusY: 5, rotation: 30, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
  },
  content: {
    corners: [
      [-5, -2],
      [5, -2],
      [5, 2],
      [-5, 2],
    ],
    baselines: [{ from: [-4, 0], to: [4, 0] }],
  },
};

const scopeOutput: ScopeOwnerOutput = {
  envelope: { shape: 'circle', rect: { x: 0, y: 0, width: 40, height: 40 } },
};

const coordinateOutput: CoordinateOwnerOutput = { id: 'anchor', position: [12, -4] };

const clipOutput: ClipOwnerOutput = {
  path: {
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'cubic', control1: [5, -4], control2: [15, 4], to: [20, 0] },
      { kind: 'move', to: [10, 10] },
      { kind: 'ellipseArc', center: [10, 10], radiusX: 8, radiusY: 4, rotation: 45, startAngle: 0, endAngle: 180 },
    ],
    fillRule: 'evenodd',
  },
};

describe('Core builtin observation contracts', () => {
  it('compares every closed owner variant by its complete discriminator', () => {
    const owners = [
      { kind: 'composite' as const, namespace: 'demo', type: 'card' },
      { kind: 'path' as const, name: 'stroke' },
      { kind: 'node' as const },
      { kind: 'scope' as const },
      { kind: 'coordinate' as const },
      { kind: 'clip' as const },
    ];

    for (const owner of owners) expect(core.isCompileObservationOwnerEqual(owner, owner)).toBe(true);
    expect(
      core.isCompileObservationOwnerEqual(owners[0], { kind: 'composite', namespace: 'other', type: 'card' }),
    ).toBe(false);
    expect(core.isCompileObservationOwnerEqual(owners[1], { kind: 'path', name: 'fill' })).toBe(false);
    expect(core.isCompileObservationOwnerEqual(owners[2], owners[3])).toBe(false);
    expect(core.isCompileObservationOwnerEqual(owners[3], owners[4])).toBe(false);
    expect(core.isCompileObservationOwnerEqual(owners[4], owners[5])).toBe(false);
  });

  it('publishes Clip as a stable occurrence expansion kind', () => {
    expect(core.CompileExpansionKind.Clip).toBe('clip');
  });

  it('round-trips every builtin owner output through JSON', () => {
    expect(core.NodeOwnerOutputSchema.parse(JSON.parse(JSON.stringify(nodeOutput)))).toEqual(nodeOutput);
    expect(core.ScopeOwnerOutputSchema.parse(JSON.parse(JSON.stringify(scopeOutput)))).toEqual(scopeOutput);
    expect(core.CoordinateOwnerOutputSchema.parse(JSON.parse(JSON.stringify(coordinateOutput)))).toEqual(
      coordinateOutput,
    );
    expect(core.ClipOwnerOutputSchema.parse(JSON.parse(JSON.stringify(clipOutput)))).toEqual(clipOutput);
  });

  it('preserves a rotated ellipseArc in Node geometry', () => {
    const shape = core.NodeOwnerOutputSchema.parse(nodeOutput).shape;
    expect(shape.outline).toContainEqual({
      kind: 'ellipseArc',
      center: [0, 0],
      radiusX: 10,
      radiusY: 5,
      rotation: 30,
      startAngle: 0,
      endAngle: 360,
    });
    expect(shape.outline?.at(-1)).toEqual({ kind: 'close' });
  });

  it('accepts an unclosed Clip subpath with cubic and rotated ellipse arc commands', () => {
    const parsed = core.ClipOwnerOutputSchema.parse(clipOutput);
    expect(parsed.path.commands.map(command => command.kind)).toEqual(['move', 'cubic', 'move', 'ellipseArc']);
    expect(parsed.path.commands.at(-1)).toMatchObject({ kind: 'ellipseArc', rotation: 45 });
    expect(parsed.path.commands).not.toContainEqual({ kind: 'close' });
  });

  it('publishes one final Node owner output from a real observed compile', () => {
    const observations: Array<CompileObservation> = [];
    const observer: core.CompileObserverDefinition = {
      key: 'test/builtin-node',
      createSession: () => ({
        select: site => site.owner.kind === 'node',
        observe: observation => observations.push(observation),
        complete: () => null,
      }),
    };

    core.observeCompileToScene(
      scene([{ type: 'node', id: 'node-a', position: [0, 0], shape: 'ellipse', rotate: 30, text: 'A' }]),
      { padding: 0 },
      [observer],
    );

    expect(observations).toHaveLength(1);
    expect(observations[0]?.owner).toEqual({ kind: 'node' });
    expect(observations[0]?.value).toMatchObject({
      shape: { name: 'ellipse', outline: expect.any(Array) },
      boundary: { name: expect.any(String) },
    });
    expect(observations[0]?.provenance.final).toEqual(observations[0]?.occurrence);
  });
});
