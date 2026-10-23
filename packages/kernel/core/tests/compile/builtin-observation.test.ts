import { describe, expect, it } from 'vitest';

import type { CompileObservation, IRScene } from '../../src';
import * as core from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

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
