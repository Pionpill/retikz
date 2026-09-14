import type { IRChild } from '@retikz/core';

import { ChildSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlexLayoutInput, FlexLayoutItemInput } from '../../src';

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
import { resolveFlexLayout } from '../../src/resolve/flex-layout';

const child: IRChild = { type: 'node', position: [0, 0], text: 'Revenue' };

/** 外部 payload 的唯一 schema 入口 */
const parseFlexLayout = (input: Record<string, unknown>) =>
  FlexLayoutSchema.parse({ namespace: 'layout', type: 'flexLayout', ...input });

describe('FlexLayout schema and factory', () => {
  it('describes the public layout and item object contracts', () => {
    expect(FlexLayoutSchema.description).toBe('Sparse JSON-safe Layout FlexLayout composite.');
    expect(FlexLayoutItemSchema.description).toBe('Sparse JSON-safe item owned by FlexLayout.');
  });

  it('creates canonical JSON IR from author input defaults', () => {
    const item = { kind: LayoutItemKind.Flex, key: 'label', child } satisfies FlexLayoutItemInput;
    const input = { children: [item] } satisfies FlexLayoutInput;
    const source = createFlexLayout(input);
    expect(source).toEqual({ namespace: 'layout', type: 'flexLayout', ...input });
    expect(parseFlexLayout(input)).toMatchObject({ direction: 'row', wrap: 'nowrap', gap: 0 });
    expect(resolveFlexLayout(parseFlexLayout(input))).toEqual(resolveFlexLayout(source));
    const parsed = resolveFlexLayout(source);

    expect(parsed).toEqual({
      namespace: 'layout',
      type: 'flexLayout',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
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
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          basis: 'content',
          grow: 0,
          shrink: 1,
        },
      ],
    });
    expect(ChildSchema.safeParse(parsed.children[0]?.child).success).toBe(true);
  });

  it('normalizes uniform gap shorthand while preserving independent physical axes', () => {
    const uniform = parseFlexLayout({ gap: 6 });
    const independent = parseFlexLayout({ gap: { column: 4, row: 8 } });
    const zero = parseFlexLayout({ gap: 0 });

    expect(uniform.gap).toBe(6);
    expect(resolveFlexLayout(uniform).gap).toEqual({ column: 6, row: 6 });
    expect(independent.gap).toEqual({ column: 4, row: 8 });
    expect(zero.gap).toBe(0);
    expect(resolveFlexLayout(zero).gap).toEqual({ column: 0, row: 0 });
  });

  it('keeps an omitted item key out of Source IR', () => {
    const parsed = parseFlexLayout({ children: [{ kind: LayoutItemKind.Flex, child }] });

    expect(parsed.children[0]).not.toHaveProperty('key');
  });

  it('keeps every nested object strict and rejects invalid numeric contracts', () => {
    const base = { children: [{ kind: 'flex', key: 'label', child }] } satisfies FlexLayoutInput;

    expect(FlexLayoutSchema.safeParse({ namespace: 'layout', type: 'flexLayout', ...base, extra: true }).success).toBe(
      false,
    );
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'layout',
        type: 'flexLayout',
        children: [{ ...base.children[0], extra: true }],
      }).success,
    ).toBe(false);
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'layout',
        type: 'flexLayout',
        ...base,
        gap: { column: 0, row: 0, extra: true },
      }).success,
    ).toBe(false);
    expect(
      FlexLayoutSchema.safeParse({
        namespace: 'layout',
        type: 'flexLayout',
        ...base,
        gap: 0,
        columnGap: 0,
      }).success,
    ).toBe(false);
    expect(() => parseFlexLayout({ ...base, gap: -1 })).toThrow();
    expect(() => parseFlexLayout({ ...base, gap: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => parseFlexLayout({ ...base, gap: { column: 1, row: -1 } })).toThrow();
    expect(() => parseFlexLayout({ ...base, gap: { column: 1, row: Number.POSITIVE_INFINITY } })).toThrow();
    expect(() => parseFlexLayout({ children: [{ ...base.children[0], grow: -1 }] })).toThrow();
    expect(() => parseFlexLayout({ children: [{ ...base.children[0], shrink: Number.NaN }] })).toThrow();
    expect(() => parseFlexLayout({ children: [{ ...base.children[0], min: 20, max: 10 }] })).toThrow();
  });

  it('rejects duplicate keys and non-flex item kinds at precise child paths', () => {
    const duplicate = FlexLayoutSchema.safeParse({
      namespace: 'layout',
      type: 'flexLayout',
      children: [
        { kind: 'flex', key: 'same', child },
        { kind: 'flex', key: 'same', child },
      ],
    });
    const wrongKind = FlexLayoutSchema.safeParse({
      namespace: 'layout',
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
      parseFlexLayout({
        direction: FlexLayoutDirection.Column,
        alignItems: LayoutAlignment.FirstBaseline,
        children: [],
      }),
    ).toThrow(/baseline/i);
    expect(() =>
      parseFlexLayout({
        direction: FlexLayoutDirection.ColumnReverse,
        children: [{ kind: 'flex', key: 'label', child, alignSelf: LayoutAlignment.LastBaseline }],
      }),
    ).toThrow(/baseline/i);
    expect(
      parseFlexLayout({
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
    expect(() => parseFlexLayout({ children: [], justifyContent: LayoutDistribution.Stretch })).toThrow();
  });
});
