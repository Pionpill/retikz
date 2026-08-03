import { describe, expect, it } from 'vitest';

import { LayoutDistribution } from '../../src';
import { solveGridTracks } from '../../src/composites/layout/grid-layout/tracks';

describe('GridLayout track solver', () => {
  it('builds separate minimum and natural profiles and resolves finite fractions', () => {
    const tracks = [
      { kind: 'fixed', value: 20 },
      { kind: 'content', mode: 'natural' },
      { kind: 'fraction', factor: 1 },
    ] as const;
    const constraints = [
      { start: 1, span: 1, minimum: 10, natural: 30 },
      { start: 2, span: 1, minimum: 5, natural: 15 },
    ];
    const indefinite = solveGridTracks(tracks, constraints, { gap: 0, distribution: LayoutDistribution.Start });
    const finite = solveGridTracks(tracks, constraints, {
      gap: 0,
      availableSize: 100,
      distribution: LayoutDistribution.Start,
    });

    expect(indefinite.minimumProfile).toEqual([20, 10, 5]);
    expect(indefinite.naturalProfile).toEqual([20, 30, 15]);
    expect(indefinite.sizes).toEqual([20, 30, 15]);
    expect(finite.sizes).toEqual([20, 30, 50]);
  });

  it('aggregates spanning constraints independently of authored order', () => {
    const tracks = [
      { kind: 'content', mode: 'minimum' },
      { kind: 'content', mode: 'minimum' },
    ] as const;
    const forward = solveGridTracks(
      tracks,
      [
        { start: 0, span: 2, minimum: 40, natural: 70 },
        { start: 0, span: 2, minimum: 50, natural: 80 },
      ],
      { gap: 0, distribution: LayoutDistribution.Start },
    );
    const reverse = solveGridTracks(
      tracks,
      [
        { start: 0, span: 2, minimum: 50, natural: 80 },
        { start: 0, span: 2, minimum: 40, natural: 70 },
      ],
      { gap: 0, distribution: LayoutDistribution.Start },
    );

    expect(forward.minimumProfile).toEqual([25, 25]);
    expect(forward.naturalProfile).toEqual([25, 25]);
    expect(reverse).toEqual(forward);
  });

  it('honors minmax lower and maximum breadth semantics in both profiles', () => {
    const constraint = [{ start: 0, span: 1, minimum: 5, natural: 30 }];
    const minNatural = solveGridTracks(
      [{ kind: 'minmax', min: { kind: 'content', mode: 'natural' }, max: { kind: 'fixed', value: 10 } }],
      constraint,
      { gap: 0, distribution: LayoutDistribution.Start },
    );
    const maxMinimum = solveGridTracks(
      [{ kind: 'minmax', min: { kind: 'fixed', value: 0 }, max: { kind: 'content', mode: 'minimum' } }],
      constraint,
      { gap: 0, distribution: LayoutDistribution.Start },
    );
    const maxNatural = solveGridTracks(
      [{ kind: 'minmax', min: { kind: 'fixed', value: 0 }, max: { kind: 'content', mode: 'natural' } }],
      constraint,
      { gap: 0, distribution: LayoutDistribution.Start },
    );

    expect(minNatural.minimumProfile).toEqual([30]);
    expect(minNatural.naturalProfile).toEqual([30]);
    expect(maxMinimum.minimumProfile).toEqual([5]);
    expect(maxMinimum.naturalProfile).toEqual([5]);
    expect(maxNatural.minimumProfile).toEqual([5]);
    expect(maxNatural.naturalProfile).toEqual([30]);
  });

  it('selects minimum or natural contribution targets for intrinsic minmax maxima', () => {
    const maximumMinimum = solveGridTracks(
      [
        { kind: 'minmax', min: { kind: 'fixed', value: 0 }, max: { kind: 'content', mode: 'minimum' } },
        { kind: 'content', mode: 'natural' },
      ],
      [
        { start: 0, span: 1, minimum: 5, natural: 30 },
        { start: 0, span: 2, minimum: 5, natural: 100 },
      ],
      { gap: 0, distribution: LayoutDistribution.Start },
    );
    const maximumNatural = solveGridTracks(
      [
        { kind: 'minmax', min: { kind: 'fixed', value: 0 }, max: { kind: 'content', mode: 'natural' } },
        { kind: 'content', mode: 'natural' },
      ],
      [
        { start: 0, span: 1, minimum: 5, natural: 30 },
        { start: 0, span: 2, minimum: 5, natural: 100 },
      ],
      { gap: 0, distribution: LayoutDistribution.Start },
    );

    expect(maximumMinimum.minimumProfile).toEqual([5, 0]);
    expect(maximumMinimum.naturalProfile).toEqual([5, 95]);
    expect(maximumNatural.minimumProfile).toEqual([5, 0]);
    expect(maximumNatural.naturalProfile).toEqual([65, 35]);
  });

  it('does not grow a fixed-only span and keeps caller inputs immutable', () => {
    const tracks = Object.freeze([
      Object.freeze({ kind: 'fixed' as const, value: 10 }),
      Object.freeze({ kind: 'fixed' as const, value: 20 }),
    ]);
    const constraints = Object.freeze([Object.freeze({ start: 0, span: 2, minimum: 100, natural: 200 })]);
    const beforeTracks = structuredClone(tracks);
    const beforeConstraints = structuredClone(constraints);

    const result = solveGridTracks(tracks, constraints, {
      gap: 5,
      availableSize: 25,
      distribution: LayoutDistribution.Start,
    });

    expect(result.minimumProfile).toEqual([10, 20]);
    expect(result.naturalProfile).toEqual([10, 20]);
    expect(result.sizes).toEqual([10, 20]);
    expect(tracks).toEqual(beforeTracks);
    expect(constraints).toEqual(beforeConstraints);
  });

  it('freezes oversized fraction bases and stretches only non-fixed tracks', () => {
    const fractions = solveGridTracks(
      [
        { kind: 'fraction', factor: 1 },
        { kind: 'fraction', factor: 3 },
      ],
      [{ start: 0, span: 1, minimum: 40, natural: 40 }],
      { gap: 0, availableSize: 100, distribution: LayoutDistribution.Start },
    );
    const stretched = solveGridTracks(
      [
        { kind: 'fixed', value: 20 },
        { kind: 'content', mode: 'natural' },
      ],
      [{ start: 1, span: 1, minimum: 10, natural: 30 }],
      { gap: 0, availableSize: 100, distribution: LayoutDistribution.Stretch },
    );

    expect(fractions.sizes).toEqual([40, 60]);
    expect(stretched.sizes).toEqual([20, 80]);
  });

  it('keeps negative overflow explicit and computes deterministic content offsets', () => {
    const overflow = solveGridTracks(
      [
        { kind: 'fixed', value: 40 },
        { kind: 'fixed', value: 40 },
      ],
      [],
      { gap: 10, availableSize: 50, distribution: LayoutDistribution.Center },
    );
    const spaced = solveGridTracks(
      [
        { kind: 'fixed', value: 20 },
        { kind: 'fixed', value: 20 },
      ],
      [],
      { gap: 10, availableSize: 100, distribution: LayoutDistribution.SpaceBetween },
    );

    expect(overflow).toMatchObject({ sizes: [40, 40], leading: -20, between: 10 });
    expect(spaced).toMatchObject({ sizes: [20, 20], leading: 0, between: 60 });
  });
});
