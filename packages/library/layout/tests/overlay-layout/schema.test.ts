import { ChildSchema } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IROverlayLayout,
  IROverlayLayoutItem,
  IROverlayPlacement,
  OverlayLayoutInput,
  OverlayLayoutItemInput,
  OverlayLayoutItemSchema,
  OverlayPlacementInput,
  OverlayPlacementSchema,
} from '../../src';

import {
  createOverlayLayout,
  LayoutAlignment,
  LayoutItemKind,
  LayoutSizeParticipation,
  OverlayLayoutSchema,
  OverlayPlacementKind,
} from '../../src';

const child = { type: 'node', position: [0, 0], text: 'Overlay' } as const;

describe('OverlayLayout schema and factory', () => {
  it('creates canonical JSON IR from author input defaults', () => {
    const item = { kind: LayoutItemKind.Overlay, key: 'plot', child } satisfies OverlayLayoutItemInput;
    const input = { children: [item] } satisfies OverlayLayoutInput;
    const parsed = createOverlayLayout(input);

    expect(parsed).toEqual({
      namespace: 'layout',
      type: 'overlayLayout',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
      justifyItems: 'center',
      alignItems: 'center',
      children: [
        {
          kind: 'overlay',
          key: 'plot',
          child,
          margin: 0,
          placement: { kind: 'aligned' },
          offset: { x: 0, y: 0 },
          sizeParticipation: 'include',
          zIndex: 0,
        },
      ],
    });
    expect(ChildSchema.safeParse(parsed.children[0]?.child).success).toBe(true);
    expectTypeOf(parsed).toEqualTypeOf<IROverlayLayout>();
    expectTypeOf(parsed.children[0]).toEqualTypeOf<IROverlayLayoutItem>();
  });

  it('keeps placement and item inputs aligned with parsed schema outputs', () => {
    const placement = {
      kind: OverlayPlacementKind.Positioned,
      at: { x: 10, y: -5 },
      width: 20,
    } satisfies OverlayPlacementInput;

    expectTypeOf<IROverlayPlacement>().toEqualTypeOf<ReturnType<typeof OverlayPlacementSchema.parse>>();
    expectTypeOf<IROverlayLayoutItem>().toEqualTypeOf<ReturnType<typeof OverlayLayoutItemSchema.parse>>();
    expect(
      createOverlayLayout({
        children: [{ kind: 'overlay', key: 'badge', child, placement }],
      }).children[0]?.placement,
    ).toEqual({
      kind: 'positioned',
      at: { x: 10, y: -5 },
      anchor: { x: 0.5, y: 0.5 },
      width: 20,
    });
  });

  it('rejects unknown fields at layout, item, placement and nested point paths', () => {
    const base = { children: [{ kind: 'overlay', key: 'badge', child }] } satisfies OverlayLayoutInput;
    expect(() =>
      OverlayLayoutSchema.parse({ namespace: 'layout', type: 'overlayLayout', ...base, extra: true }),
    ).toThrow();
    expect(() => createOverlayLayout({ children: [{ ...base.children[0], extra: true } as never] })).toThrow();
    expect(() =>
      createOverlayLayout({
        children: [
          {
            ...base.children[0],
            placement: { kind: 'positioned', at: { x: 0, y: 0 }, extra: true } as never,
          },
        ],
      }),
    ).toThrow();
    for (const field of ['at', 'anchor'] as const) {
      expect(() =>
        createOverlayLayout({
          children: [
            {
              ...base.children[0],
              placement: {
                kind: 'positioned',
                at: { x: 0, y: 0 },
                anchor: { x: 0.5, y: 0.5 },
                [field]: { x: 0, y: 0, extra: true },
              } as never,
            },
          ],
        }),
      ).toThrow();
    }
    expect(() =>
      createOverlayLayout({ children: [{ ...base.children[0], offset: { x: 0, y: 0, extra: true } as never }] }),
    ).toThrow();
  });

  it('rejects invalid anchor, size, offset, zIndex, duplicate keys and item kind', () => {
    const positioned = (overrides: Record<string, unknown>) => ({
      kind: 'positioned',
      at: { x: 0, y: 0 },
      ...overrides,
    });
    for (const placement of [
      positioned({ anchor: { x: -0.1, y: 0.5 } }),
      positioned({ anchor: { x: 0.5, y: 1.1 } }),
      positioned({ width: -1 }),
      positioned({ height: Number.POSITIVE_INFINITY }),
      positioned({ at: { x: Number.NaN, y: 0 } }),
    ]) {
      expect(() =>
        createOverlayLayout({ children: [{ kind: 'overlay', key: 'bad', child, placement } as never] }),
      ).toThrow();
    }
    expect(() =>
      createOverlayLayout({
        children: [{ kind: 'overlay', key: 'bad', child, offset: { x: Number.NaN, y: 0 } }],
      }),
    ).toThrow();
    expect(() => createOverlayLayout({ children: [{ kind: 'overlay', key: 'bad', child, zIndex: 0.5 }] })).toThrow();
    expect(() =>
      createOverlayLayout({
        children: [
          { kind: 'overlay', key: 'same', child },
          { kind: 'overlay', key: 'same', child },
        ],
      }),
    ).toThrow(/duplicate/i);
    expect(() => createOverlayLayout({ children: [{ kind: 'grid', key: 'bad', child } as never] })).toThrow();
  });

  it('rejects effective positioned baselines and aligned baseline y offsets', () => {
    expect(() =>
      createOverlayLayout({
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          {
            kind: 'overlay',
            key: 'positioned',
            child,
            placement: { kind: 'positioned', at: { x: 0, y: 0 } },
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      createOverlayLayout({
        children: [
          {
            kind: 'overlay',
            key: 'positioned',
            child,
            placement: { kind: 'positioned', at: { x: 0, y: 0 } },
            alignSelf: LayoutAlignment.LastBaseline,
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      createOverlayLayout({
        alignItems: LayoutAlignment.FirstBaseline,
        children: [{ kind: 'overlay', key: 'aligned', child, offset: { x: 2, y: 1 } }],
      }),
    ).toThrow();
    expect(
      createOverlayLayout({
        alignItems: LayoutAlignment.FirstBaseline,
        children: [
          {
            kind: 'overlay',
            key: 'positioned',
            child,
            placement: { kind: 'positioned', at: { x: 0, y: 0 } },
            alignSelf: LayoutAlignment.Start,
            sizeParticipation: LayoutSizeParticipation.Exclude,
          },
        ],
      }).children[0],
    ).toMatchObject({ alignSelf: 'start', sizeParticipation: 'exclude' });
  });
});
