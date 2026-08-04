import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  IRLegend,
  IRLegendItem,
  IRLegendItemsContent,
  IRLegendRampContent,
  IRLegendTick,
  LegendInput,
} from '../../src/composites/presentation/legend/types';

import { LayoutAlignment } from '../../src/composites/layout/shared';
import {
  LegendContentKind,
  LegendDirection,
  LegendSampleAlignment,
  LegendWrap,
} from '../../src/composites/presentation/legend/constants';
import { createLegend } from '../../src/composites/presentation/legend/factory';
import { LegendSchema } from '../../src/composites/presentation/legend/schema';

const sample = { type: 'node', position: [0, 0], text: 'Sample' } as const;
const label = { type: 'node', position: [0, 0], text: 'Label' } as const;

const expectIssuePath = (value: unknown, path: string): void => {
  const parsed = LegendSchema.safeParse(value);

  expect(parsed.success).toBe(false);
  if (!parsed.success) {
    expect(parsed.error.issues.some(issue => issue.path.join('.') === path)).toBe(true);
  }
};

describe('Legend schema and factory', () => {
  it('creates canonical items IR with every schema default persisted', () => {
    const input = {
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'primary', sample, label }],
      },
    } satisfies LegendInput;
    const parsed = createLegend(input);

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'legend',
      titleGap: 8,
      contentAlign: 'start',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
      content: {
        kind: 'items',
        direction: 'vertical',
        wrap: 'nowrap',
        gap: { row: 8, column: 8 },
        sampleGap: 8,
        sampleAlign: 'center',
        items: [{ key: 'primary', sample, label }],
      },
    });
    expectTypeOf(parsed).toEqualTypeOf<IRLegend>();
    expectTypeOf(parsed.content).toMatchTypeOf<IRLegendItemsContent | IRLegendRampContent>();
    if (parsed.content.kind === LegendContentKind.Items) {
      expectTypeOf(parsed.content).toEqualTypeOf<IRLegendItemsContent>();
      expectTypeOf(parsed.content.items).toEqualTypeOf<Array<IRLegendItem>>();
    }
    expectTypeOf<IRLegendItemsContent['gap']>().toEqualTypeOf<{ row: number; column: number }>();
  });

  it('normalizes uniform gap shorthand while preserving independent axis values and explicit zero', () => {
    const uniform = createLegend({
      content: { kind: LegendContentKind.Items, gap: 5, items: [] },
    });
    const independent = createLegend({
      content: { kind: LegendContentKind.Items, gap: { row: 6, column: 5 }, items: [] },
    });
    const zero = createLegend({
      content: { kind: LegendContentKind.Items, gap: 0, items: [] },
    });

    expect(uniform.content).toMatchObject({ gap: { row: 5, column: 5 } });
    expect(independent.content).toMatchObject({ gap: { row: 6, column: 5 } });
    expect(zero.content).toMatchObject({ gap: { row: 0, column: 0 } });
  });

  it('creates canonical ramp IR and survives a real JSON round-trip', () => {
    const parsed = createLegend({
      title: label,
      content: {
        kind: LegendContentKind.Ramp,
        sample,
        ticks: [
          { key: 'low', offset: 0, label },
          { key: 'high', offset: 1 },
        ],
      },
    });
    const roundTripped = LegendSchema.parse(JSON.parse(JSON.stringify(parsed)));

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'legend',
      title: label,
      titleGap: 8,
      contentAlign: 'start',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
      content: {
        kind: 'ramp',
        direction: 'vertical',
        sample,
        sampleGap: 8,
        ticks: [
          { key: 'low', offset: 0, label },
          { key: 'high', offset: 1 },
        ],
      },
    });
    expect(roundTripped).toEqual(parsed);
    expectTypeOf(parsed.content).toMatchTypeOf<IRLegendItemsContent | IRLegendRampContent>();
    if (parsed.content.kind === LegendContentKind.Ramp) {
      expectTypeOf(parsed.content).toEqualTypeOf<IRLegendRampContent>();
      expectTypeOf(parsed.content.ticks).toEqualTypeOf<Array<IRLegendTick>>();
    }
  });

  it('persists explicit content alignment through JSON and rejects unsupported values at the root field', () => {
    const centered = createLegend({
      contentAlign: LayoutAlignment.Center,
      content: { kind: LegendContentKind.Items, items: [] },
    });
    const ended = createLegend({
      contentAlign: LayoutAlignment.End,
      content: { kind: LegendContentKind.Ramp, sample, ticks: [] },
    });

    expect(LegendSchema.parse(JSON.parse(JSON.stringify(centered))).contentAlign).toBe(LayoutAlignment.Center);
    expect(LegendSchema.parse(JSON.parse(JSON.stringify(ended))).contentAlign).toBe(LayoutAlignment.End);
    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        contentAlign: 'stretch',
        content: { kind: 'items', items: [] },
      },
      'contentAlign',
    );
  });

  it('preserves explicit direction, wrapping, alignment, spacing, size, padding, and overflow', () => {
    expect(
      createLegend({
        title: label,
        titleGap: 3,
        size: { x: { kind: 'fixed', value: 120 }, y: { kind: 'fill', min: 40, max: 200 } },
        padding: { top: 1, right: 2, bottom: 3, left: 4 },
        overflow: 'clip',
        content: {
          kind: LegendContentKind.Items,
          direction: LegendDirection.Horizontal,
          wrap: LegendWrap.Wrap,
          gap: { row: 6, column: 5 },
          sampleGap: 7,
          sampleAlign: LegendSampleAlignment.End,
          items: [],
        },
      }),
    ).toMatchObject({
      titleGap: 3,
      size: { x: { kind: 'fixed', value: 120 }, y: { kind: 'fill', min: 40, max: 200 } },
      padding: { top: 1, right: 2, bottom: 3, left: 4 },
      overflow: 'clip',
      content: {
        direction: 'horizontal',
        wrap: 'wrap',
        gap: { row: 6, column: 5 },
        sampleGap: 7,
        sampleAlign: 'end',
      },
    });
  });

  it('rejects unknown root, content, item, and tick fields at their authored paths', () => {
    const root = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    expectIssuePath({ ...root, extra: true }, '');
    expectIssuePath({ ...root, content: { ...root.content, extra: true } }, 'content');
    expectIssuePath({ ...root, content: { ...root.content, columnGap: 1 } }, 'content');
    expectIssuePath({ ...root, content: { ...root.content, rowGap: 1 } }, 'content');
    expectIssuePath(
      {
        ...root,
        content: { kind: 'items', items: [{ key: 'item', sample, extra: true }] },
      },
      'content.items.0',
    );
    expectIssuePath(
      {
        ...root,
        content: { kind: 'ramp', sample, ticks: [{ key: 'tick', offset: 0, extra: true }] },
      },
      'content.ticks.0',
    );
  });

  it('rejects root id and non-child title, sample, and label values', () => {
    const base = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    expectIssuePath({ ...base, id: 'legend' }, '');
    expectIssuePath({ ...base, title: 'Legend' }, 'title');
    expectIssuePath(
      { ...base, content: { kind: 'items', items: [{ key: 'item', sample: 'line' }] } },
      'content.items.0.sample',
    );
    expectIssuePath(
      { ...base, content: { kind: 'items', items: [{ key: 'item', sample, label: 'Label' }] } },
      'content.items.0.label',
    );
    expectIssuePath(
      { ...base, content: { kind: 'ramp', sample, ticks: [{ key: 'tick', offset: 0, label: 'Low' }] } },
      'content.ticks.0.label',
    );
  });

  it('rejects blank and duplicate authored keys at the key that must change', () => {
    const base = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    expectIssuePath({ ...base, content: { kind: 'items', items: [{ key: '   ', sample }] } }, 'content.items.0.key');
    expectIssuePath(
      {
        ...base,
        content: {
          kind: 'items',
          items: [
            { key: 'same', sample },
            { key: 'same', sample },
          ],
        },
      },
      'content.items.1.key',
    );
    expectIssuePath(
      {
        ...base,
        content: {
          kind: 'ramp',
          sample,
          ticks: [
            { key: 'same', offset: 0 },
            { key: 'same', offset: 1 },
          ],
        },
      },
      'content.ticks.1.key',
    );
  });

  it('rejects negative or non-finite spacing and invalid overflow values', () => {
    const items = { kind: LegendContentKind.Items, items: [] } satisfies Extract<
      LegendInput['content'],
      { kind: typeof LegendContentKind.Items }
    >;

    expect(() => createLegend({ titleGap: -1, content: items })).toThrow();
    expect(() => createLegend({ padding: -1, content: items })).toThrow();
    expect(() => createLegend({ content: { ...items, gap: -1 } })).toThrow();
    expect(() => createLegend({ content: { ...items, gap: { row: Number.POSITIVE_INFINITY, column: 8 } } })).toThrow();
    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        content: { ...items, gap: { row: 8, column: -1 } },
      },
      'content.gap.column',
    );
    expect(() => createLegend({ content: { ...items, sampleGap: Number.NaN } })).toThrow();
    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        overflow: 'scroll',
        content: items,
      },
      'overflow',
    );
  });

  it('rejects malformed content, fixed, and fill size variants', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'items', items: [] },
    } as const;

    expectIssuePath({ ...base, size: { x: { kind: 'content', value: 10 }, y: { kind: 'content' } } }, 'size.x');
    expectIssuePath({ ...base, size: { x: { kind: 'fixed' }, y: { kind: 'content' } } }, 'size.x.value');
    expectIssuePath({ ...base, size: { x: { kind: 'fixed', value: -1 }, y: { kind: 'content' } } }, 'size.x.value');
    expectIssuePath({ ...base, size: { x: { kind: 'fill', value: 10 }, y: { kind: 'content' } } }, 'size.x');
    expectIssuePath({ ...base, size: { x: { kind: 'fill', min: 20, max: 10 }, y: { kind: 'content' } } }, 'size.x.max');
  });

  it('rejects fields from the other content form instead of silently dropping them', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
    } as const;

    expectIssuePath({ ...base, content: { kind: 'items', items: [], sample, ticks: [] } }, 'content');
    expectIssuePath({ ...base, content: { kind: 'ramp', sample, ticks: [], items: [], wrap: 'wrap' } }, 'content');
  });

  it('rejects non-finite, out-of-range, and decreasing ramp offsets at precise paths', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'ramp', sample },
    } as const;

    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'nan', offset: Number.NaN }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'infinite', offset: Number.POSITIVE_INFINITY }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'low', offset: -0.01 }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'high', offset: 1.01 }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      {
        ...base,
        content: {
          ...base.content,
          ticks: [
            { key: 'high', offset: 0.8 },
            { key: 'low', offset: 0.2 },
          ],
        },
      },
      'content.ticks.1.offset',
    );
  });
});
