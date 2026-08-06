import { ChildSchema } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { FlexLayoutInput, FlexLayoutItemInput, IRFlexLayout, IRFlexLayoutItem } from '../../src';

import {
  createFlexLayout,
  FlexLayoutDirection,
  FlexLayoutItemSchema,
  FlexLayoutSchema,
  FlexLayoutWrap,
  LayoutAlignment,
  LayoutDistribution,
  LayoutItemKind,
} from '../../src';

const child = { type: 'node', position: [0, 0], text: 'Revenue' } as const;

describe('FlexLayout schema and factory', () => {
  it('describes the public layout and item object contracts', () => {
    expect(FlexLayoutSchema.description).toBe('Canonical JSON-safe Standard FlexLayout composite.');
    expect(FlexLayoutItemSchema.description).toBe('Canonical JSON-safe item owned by FlexLayout.');
  });

  it('creates canonical JSON IR from author input defaults', () => {
    const item = { kind: LayoutItemKind.Flex, key: 'label', child } satisfies FlexLayoutItemInput;
    const input = { children: [item] } satisfies FlexLayoutInput;
    const parsed = createFlexLayout(input);

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'flexLayout',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
      direction: 'row',
      wrap: 'nowrap',
      gap: { column: 0, row: 0 },
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'start',
      children: [
        {
          kind: 'flex',
          key: 'label',
          child,
          margin: 0,
          basis: 'content',
          grow: 0,
          shrink: 1,
        },
      ],
    });
    expect(ChildSchema.safeParse(parsed.children[0]?.child).success).toBe(true);
    expectTypeOf(parsed).toEqualTypeOf<IRFlexLayout>();
    expectTypeOf(parsed.children[0]).toEqualTypeOf<IRFlexLayoutItem>();
  });

  it('normalizes uniform gap shorthand while preserving independent physical axes', () => {
    const uniform = createFlexLayout({ gap: 6 });
    const independent = createFlexLayout({ gap: { column: 4, row: 8 } });
    const zero = createFlexLayout({ gap: 0 });

    expect(uniform.gap).toEqual({ column: 6, row: 6 });
    expect(independent.gap).toEqual({ column: 4, row: 8 });
    expect(zero.gap).toEqual({ column: 0, row: 0 });
    expectTypeOf(uniform.gap).toEqualTypeOf<{ column: number; row: number }>();
    expectTypeOf<IRFlexLayout['gap']>().toEqualTypeOf<{ column: number; row: number }>();
  });

  it('keeps every nested object strict and rejects invalid numeric contracts', () => {
    const base = { children: [{ kind: 'flex', key: 'label', child }] } satisfies FlexLayoutInput;

    expect(
      FlexLayoutSchema.safeParse({ namespace: 'standard', type: 'flexLayout', ...base, extra: true }).success,
    ).toBe(false);
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'standard',
        type: 'flexLayout',
        children: [{ ...base.children[0], extra: true }],
      }).success,
    ).toBe(false);
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'standard',
        type: 'flexLayout',
        ...base,
        gap: { column: 0, row: 0, extra: true },
      }).success,
    ).toBe(false);
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'standard',
        type: 'flexLayout',
        ...base,
        gap: 0,
        columnGap: 0,
      }).success,
    ).toBe(false);
    expect(() => createFlexLayout({ ...base, gap: -1 })).toThrow();
    expect(() => createFlexLayout({ ...base, gap: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => createFlexLayout({ ...base, gap: { column: 1, row: -1 } })).toThrow();
    expect(() => createFlexLayout({ ...base, gap: { column: 1, row: Number.POSITIVE_INFINITY } })).toThrow();
    expect(() => createFlexLayout({ children: [{ ...base.children[0], grow: -1 }] })).toThrow();
    expect(() => createFlexLayout({ children: [{ ...base.children[0], shrink: Number.NaN }] })).toThrow();
    expect(() => createFlexLayout({ children: [{ ...base.children[0], min: 20, max: 10 }] })).toThrow();
  });

  it('rejects duplicate keys and non-flex item kinds at precise child paths', () => {
    const duplicate = FlexLayoutSchema.safeParse({
      namespace: 'standard',
      type: 'flexLayout',
      children: [
        { kind: 'flex', key: 'same', child },
        { kind: 'flex', key: 'same', child },
      ],
    });
    const wrongKind = FlexLayoutSchema.safeParse({
      namespace: 'standard',
      type: 'flexLayout',
      children: [{ kind: 'grid', key: 'wrong', child }],
    });

    expect(duplicate.success).toBe(false);
    if (!duplicate.success)
      expect(duplicate.error.issues.some(issue => issue.path.join('.') === 'children.1.key')).toBe(true);
    expect(wrongKind.success).toBe(false);
    if (!wrongKind.success)
      expect(wrongKind.error.issues.some(issue => issue.path.join('.') === 'children.0.kind')).toBe(true);
  });

  it('allows baseline alignment only when the physical cross axis is y', () => {
    expect(() =>
      createFlexLayout({
        direction: FlexLayoutDirection.Column,
        alignItems: LayoutAlignment.FirstBaseline,
        children: [],
      }),
    ).toThrow(/baseline/i);
    expect(() =>
      createFlexLayout({
        direction: FlexLayoutDirection.ColumnReverse,
        children: [{ kind: 'flex', key: 'label', child, alignSelf: LayoutAlignment.LastBaseline }],
      }),
    ).toThrow(/baseline/i);
    expect(
      createFlexLayout({
        direction: FlexLayoutDirection.Row,
        wrap: FlexLayoutWrap.WrapReverse,
        justifyContent: LayoutDistribution.SpaceBetween,
        alignItems: LayoutAlignment.FirstBaseline,
        children: [{ kind: 'flex', key: 'label', child }],
      }),
    ).toMatchObject({
      direction: 'row',
      wrap: 'wrap-reverse',
      justifyContent: 'space-between',
      alignItems: 'first-baseline',
    });
    expect(() => createFlexLayout({ children: [], justifyContent: LayoutDistribution.Stretch as never })).toThrow();
  });
});
