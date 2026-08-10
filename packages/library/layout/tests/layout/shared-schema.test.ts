import { ChildSchema, LayoutAxisProposalKind, LayoutIntrinsicMode } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IRLayoutAxisSize,
  IRLayoutContainerBox,
  IRLayoutItemBase,
  IRLayoutSize,
  LayoutAxisSizeInput,
  LayoutContainerBoxInput,
  LayoutEdgeAlignmentValue,
  LayoutItemBaseInput,
  LayoutSizeInput,
} from '../../src';

import {
  LayoutAlignment,
  LayoutAlignmentSchema,
  LayoutAxisSizeKind,
  LayoutAxisSizeSchema,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutEdgeAlignmentSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSizeSchema,
} from '../../src';

describe('shared layout schema', () => {
  it('describes the public container and item object contracts', () => {
    expect(LayoutContainerBoxSchema.description).toBe('Shared Box contract for Layout containers.');
    expect(LayoutItemBaseSchema.description).toBe('Shared JSON-safe child item contract for Layouts.');
  });

  it('parses canonical Box defaults while author inputs may omit them', () => {
    const input = {} satisfies LayoutContainerBoxInput;

    expect(LayoutContainerBoxSchema.parse(input)).toEqual({
      size: {
        x: { kind: 'content' },
        y: { kind: 'content' },
      },
      padding: 0,
      overflow: 'visible',
    });
    expectTypeOf<IRLayoutContainerBox>().toMatchTypeOf<{
      size: IRLayoutSize;
      padding: number | object;
      overflow: 'visible' | 'clip';
    }>();
  });

  it('keeps content, fixed and fill as strict discriminated axis policies', () => {
    const inputs = [
      { kind: LayoutAxisSizeKind.Content, min: 10, max: 20 },
      { kind: LayoutAxisSizeKind.Fixed, value: 12 },
      { kind: LayoutAxisSizeKind.Fill, min: 4 },
    ] satisfies Array<LayoutAxisSizeInput>;

    expect(inputs.map(input => LayoutAxisSizeSchema.parse(input))).toEqual(inputs);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fixed' }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fixed', value: 1, max: 2 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'content', min: 2, max: 1 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fill', min: -1 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'content', max: Number.POSITIVE_INFINITY }).success).toBe(false);
    expectTypeOf<IRLayoutAxisSize>().toEqualTypeOf<ReturnType<typeof LayoutAxisSizeSchema.parse>>();
  });

  it('parses partial physical size and spacing without losing explicit zero', () => {
    const sizeInput = { x: { kind: 'fixed', value: 0 } } satisfies LayoutSizeInput;

    expect(LayoutSizeSchema.parse(sizeInput)).toEqual({
      x: { kind: 'fixed', value: 0 },
      y: { kind: 'content' },
    });
    expect(
      LayoutContainerBoxSchema.parse({
        padding: { default: 1, x: 2, left: 0 },
        overflow: LayoutOverflow.Clip,
      }),
    ).toMatchObject({ padding: { default: 1, x: 2, left: 0 }, overflow: 'clip' });
  });

  it('accepts any JSON-safe Core child and keeps container-local item identity strict', () => {
    const input = {
      kind: LayoutItemKind.Flex,
      key: 'legend-label',
      margin: { right: 8 },
      child: { type: 'node', position: [0, 0], text: 'Revenue' },
    } satisfies LayoutItemBaseInput;
    const parsed = LayoutItemBaseSchema.parse(input);

    expect(parsed).toEqual(input);
    expect(ChildSchema.safeParse(input.child).success).toBe(true);
    expect(LayoutItemBaseSchema.safeParse({ ...input, key: '' }).success).toBe(false);
    expect(LayoutItemBaseSchema.safeParse({ ...input, unknown: true }).success).toBe(false);
    expectTypeOf(parsed).toEqualTypeOf<IRLayoutItemBase>();
  });

  it('keeps edge alignment narrower than baseline-aware alignment', () => {
    expect(LayoutAlignmentSchema.options).toEqual([
      LayoutAlignment.Start,
      LayoutAlignment.Center,
      LayoutAlignment.End,
      LayoutAlignment.Stretch,
      LayoutAlignment.FirstBaseline,
      LayoutAlignment.LastBaseline,
    ]);
    expect(LayoutEdgeAlignmentSchema.safeParse(LayoutAlignment.FirstBaseline).success).toBe(false);
    expect(LayoutEdgeAlignmentSchema.safeParse(LayoutAlignment.Stretch).success).toBe(true);
    expectTypeOf<LayoutEdgeAlignmentValue>().toEqualTypeOf<'start' | 'center' | 'end' | 'stretch'>();
    expect(Object.values(LayoutDistribution)).toEqual([
      'start',
      'center',
      'end',
      'stretch',
      'space-between',
      'space-around',
      'space-evenly',
    ]);
  });

  it('uses Core proposal vocabulary without introducing a parallel layout protocol', () => {
    const proposals = [
      { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      { kind: LayoutAxisProposalKind.Range, min: 0, max: 10 },
      { kind: LayoutAxisProposalKind.Exact, value: 10 },
    ] as const;

    expect(proposals.map(proposal => proposal.kind)).toEqual(['intrinsic', 'intrinsic', 'range', 'exact']);
  });
});
