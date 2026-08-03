import type { LayoutChildResult } from '@retikz/core';

import { LayoutAlignmentGuideDimension, LayoutAlignmentGuideName } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { LayoutAlignment, LayoutSizeParticipation, OverlayPlacementKind } from '../../src';
import {
  placeOverlayItem,
  resolveOverlayProfile,
  sortOverlayPaintOrder,
} from '../../src/composites/layout/overlay-layout/solve';

const result = (
  width: number,
  height: number,
  options: Partial<{
    allocationX: number;
    allocationY: number;
    allocationWidth: number;
    allocationHeight: number;
    firstBaseline: number;
    lastBaseline: number;
  }> = {},
): LayoutChildResult => ({
  slotSize: { width, height },
  allocationBounds: {
    x: options.allocationX ?? 0,
    y: options.allocationY ?? 0,
    width: options.allocationWidth ?? width,
    height: options.allocationHeight ?? height,
  },
  visualBounds: { x: 0, y: 0, width, height },
  alignmentGuides: [
    ...(options.firstBaseline === undefined
      ? []
      : [
          {
            name: LayoutAlignmentGuideName.FirstBaseline,
            dimension: LayoutAlignmentGuideDimension.Y,
            position: options.firstBaseline,
          } as const,
        ]),
    ...(options.lastBaseline === undefined
      ? []
      : [
          {
            name: LayoutAlignmentGuideName.LastBaseline,
            dimension: LayoutAlignmentGuideDimension.Y,
            position: options.lastBaseline,
          } as const,
        ]),
  ],
  replay: (() => {
    throw new Error('Pure Overlay solver must not replay');
  }) as never,
});

const margin = (value = 0) => ({ top: value, right: value, bottom: value, left: value });

describe('OverlayLayout pure solver', () => {
  it('takes the maximum aligned outer slot for each profile', () => {
    const profile = resolveOverlayProfile([
      {
        sourceIndex: 0,
        placement: { kind: OverlayPlacementKind.Aligned },
        margin: { top: 1, right: 2, bottom: 3, left: 4 },
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.Center,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(20, 1),
        yResult: result(1, 10),
      },
      {
        sourceIndex: 1,
        placement: { kind: OverlayPlacementKind.Aligned },
        margin: margin(0),
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.Start,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(30, 1),
        yResult: result(1, 20),
      },
    ]);

    expect(profile.contentSize).toEqual({ width: 30, height: 20 });
  });

  it('uses positioned slot, anchor, offset and margin only for positive-side contribution', () => {
    const positive = resolveOverlayProfile([
      {
        sourceIndex: 0,
        placement: {
          kind: OverlayPlacementKind.Positioned,
          at: { x: 20, y: 10 },
          anchor: { x: 0.5, y: 0.5 },
        },
        margin: margin(1),
        offset: { x: 2, y: -1 },
        alignment: LayoutAlignment.Start,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(10, 1),
        yResult: result(1, 4),
      },
    ]);
    const negative = resolveOverlayProfile([
      {
        sourceIndex: 0,
        placement: {
          kind: OverlayPlacementKind.Positioned,
          at: { x: -100, y: -100 },
          anchor: { x: 1, y: 1 },
        },
        margin: margin(0),
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.Start,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(10, 1),
        yResult: result(1, 4),
      },
    ]);

    expect(positive.contentSize).toEqual({ width: 28, height: 12 });
    expect(negative.contentSize).toEqual({ width: 0, height: 0 });
  });

  it('excludes items from structural size while preserving a finite profile', () => {
    const profile = resolveOverlayProfile([
      {
        sourceIndex: 0,
        placement: { kind: OverlayPlacementKind.Aligned },
        margin: margin(100),
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.FirstBaseline,
        sizeParticipation: LayoutSizeParticipation.Exclude,
        xResult: result(100, 100),
        yResult: result(100, 100, { firstBaseline: 90 }),
      },
    ]);

    expect(profile).toEqual({ contentSize: { width: 0, height: 0 } });
  });

  it('forms independent baseline metrics from include aligned participants', () => {
    const first = resolveOverlayProfile([
      {
        sourceIndex: 0,
        placement: { kind: OverlayPlacementKind.Aligned },
        margin: margin(0),
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.FirstBaseline,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(10, 1),
        yResult: result(1, 10, { firstBaseline: 7 }),
      },
      {
        sourceIndex: 1,
        placement: { kind: OverlayPlacementKind.Aligned },
        margin: margin(0),
        offset: { x: 0, y: 0 },
        alignment: LayoutAlignment.FirstBaseline,
        sizeParticipation: LayoutSizeParticipation.Include,
        xResult: result(10, 1),
        yResult: result(1, 15),
      },
    ]);

    expect(first.contentSize).toEqual({ width: 10, height: 22 });
    expect(first.firstBaseline).toEqual({ ascent: 7, descent: 15 });
  });

  it('places aligned and positioned slots while compensating allocation origins', () => {
    const aligned = placeOverlayItem({
      placement: { kind: OverlayPlacementKind.Aligned },
      content: { x: 0, y: 0, width: 100, height: 50 },
      margin: margin(10),
      offset: { x: 0, y: 0 },
      justify: LayoutAlignment.Center,
      align: LayoutAlignment.End,
      result: result(20, 10, { allocationX: -5, allocationY: 2, allocationWidth: 20, allocationHeight: 10 }),
    });
    const positioned = placeOverlayItem({
      placement: {
        kind: OverlayPlacementKind.Positioned,
        at: { x: 50, y: 20 },
        anchor: { x: 0.5, y: 0.5 },
      },
      content: { x: 0, y: 0, width: 100, height: 50 },
      margin: margin(20),
      offset: { x: 2, y: -1 },
      justify: LayoutAlignment.End,
      align: LayoutAlignment.Start,
      result: result(20, 10, { allocationX: -5, allocationY: 2, allocationWidth: 30, allocationHeight: 10 }),
    });

    expect(aligned.translation).toEqual({ x: 45, y: 28 });
    expect(positioned.slot).toEqual({ x: 42, y: 14, width: 20, height: 10 });
    expect(positioned.translation).toEqual({ x: 37, y: 12 });
  });

  it('sorts paint order by zIndex and then authored source index', () => {
    expect(
      sortOverlayPaintOrder([
        { sourceIndex: 0, zIndex: 2 },
        { sourceIndex: 1, zIndex: -1 },
        { sourceIndex: 2, zIndex: 2 },
        { sourceIndex: 3, zIndex: 0 },
      ]),
    ).toEqual([1, 3, 0, 2]);
  });
});
