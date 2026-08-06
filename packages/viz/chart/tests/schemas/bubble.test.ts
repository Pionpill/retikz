import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRBubblePointPatch } from '../../src/families/scatter-points/shared';

import { BubbleChartSpecSchema } from '../../src/families/scatter-points/bubble';
import { BubblePointPatchSchema, StrictSizeFieldChannelSchema } from '../../src/families/scatter-points/shared';
import { ChartSpecSchema, ChartType } from '../../src/schemas/internal';

const minimalBubble = {
  namespace: 'chart',
  type: 'bubble',
  data: { reference: 'rows' },
  encoding: {
    x: { field: 'amount' },
    y: { field: 'margin' },
    size: { field: 'volume' },
  },
} as const;

describe('Bubble Chart schema', () => {
  it('parses and round-trips a distinct Bubble variant', () => {
    const parsed = BubbleChartSpecSchema.parse(minimalBubble);

    expect(ChartType.Bubble).toBe('bubble');
    expect(parsed.type).toBe('bubble');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(ChartSpecSchema.parse(minimalBubble)).toEqual(parsed);
  });

  it('accepts datum labels and non-reserved Point capabilities', () => {
    expect(
      BubbleChartSpecSchema.parse({
        ...minimalBubble,
        encoding: {
          ...minimalBubble.encoding,
          color: { field: 'group' },
          opacity: { field: 'confidence' },
          shape: { field: 'kind' },
        },
        mark: {
          color: { kind: 'constant', value: '#2563eb' },
          opacity: { kind: 'constant', value: 0.7 },
          shape: { kind: 'constant', value: 'circle' },
          label: { content: { field: 'name' } },
          encoding: {
            color: { field: 'group' },
            channels: { halo: { value: 0.4 } },
            depth: { field: 'depth' },
          },
        },
      }),
    ).toMatchObject({
      type: 'bubble',
      mark: {
        label: { content: { field: 'name' } },
        encoding: { depth: { field: 'depth' } },
      },
    });
  });

  it.each([
    ['missing required size', { ...minimalBubble, encoding: { x: { field: 'amount' }, y: { field: 'margin' } } }],
    ['constant core size', { ...minimalBubble, encoding: { ...minimalBubble.encoding, size: { value: 8 } } }],
    ['top-level mark size', { ...minimalBubble, mark: { size: { kind: 'constant', value: 8 } } }],
    ['nested mark size', { ...minimalBubble, mark: { encoding: { size: { field: 'otherVolume' } } } }],
    ['nested custom size', { ...minimalBubble, mark: { encoding: { channels: { size: { field: 'otherVolume' } } } } }],
    ['nested text mode', { ...minimalBubble, mark: { encoding: { text: { field: 'name' } } } }],
    ['nested x', { ...minimalBubble, mark: { encoding: { x: { field: 'otherX' } } } }],
    ['nested y', { ...minimalBubble, mark: { encoding: { y: { field: 'otherY' } } } }],
    ['unknown top-level key', { ...minimalBubble, unknown: true }],
    ['unknown mark key', { ...minimalBubble, mark: { unknown: true } }],
  ])('rejects %s', (_label, input) => {
    expect(() => BubbleChartSpecSchema.parse(input)).toThrow();
  });

  it('projects reserved Point paths as optional never fields', () => {
    type BubbleEncodingPatch = NonNullable<IRBubblePointPatch['encoding']>;

    expectTypeOf<IRBubblePointPatch['size']>().toEqualTypeOf<undefined>();
    expectTypeOf<BubbleEncodingPatch['size']>().toEqualTypeOf<undefined>();
    expectTypeOf<BubbleEncodingPatch['text']>().toEqualTypeOf<undefined>();
    expectTypeOf<BubbleEncodingPatch['x']>().toEqualTypeOf<undefined>();
    expectTypeOf<BubbleEncodingPatch['y']>().toEqualTypeOf<undefined>();
    expectTypeOf<{ encoding: { depth: { field: string } } }>().toMatchTypeOf<IRBubblePointPatch>();
  });

  it('normalizes explicit undefined patch keys recursively to a JSON-safe canonical patch', () => {
    const parsed = BubblePointPatchSchema.parse({
      size: undefined,
      opacity: undefined,
      encoding: { text: undefined, size: undefined },
    });

    expect(parsed).toEqual({ encoding: {} });
    expect(Object.hasOwn(parsed, 'size')).toBe(false);
    expect(Object.hasOwn(parsed, 'opacity')).toBe(false);
    expect(Object.hasOwn(parsed.encoding ?? {}, 'text')).toBe(false);
    expect(Object.hasOwn(parsed.encoding ?? {}, 'size')).toBe(false);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('treats an undefined custom size key as absent without accepting a concrete binding', () => {
    const parsed = BubblePointPatchSchema.parse({ encoding: { channels: { size: undefined } } });

    expect(parsed).toEqual({ encoding: { channels: {} } });
    expect(Object.hasOwn(parsed.encoding?.channels ?? {}, 'size')).toBe(false);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(() =>
      BubblePointPatchSchema.parse({ encoding: { channels: { size: { field: 'otherVolume' } } } }),
    ).toThrow();
  });

  it('normalizes explicit undefined keys throughout the complete Bubble variant', () => {
    const input = {
      ...minimalBubble,
      id: undefined,
      encoding: {
        ...minimalBubble.encoding,
        x: { field: 'amount', scale: undefined },
        size: { field: 'volume', scale: undefined, value: undefined },
        opacity: undefined,
      },
      mark: { opacity: undefined },
    };
    const parsed = BubbleChartSpecSchema.parse(input);

    expect(Object.hasOwn(parsed, 'id')).toBe(false);
    expect(Object.hasOwn(parsed.encoding, 'opacity')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.x, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.size, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.encoding.size, 'value')).toBe(false);
    expect(parsed.mark).toEqual({});
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(ChartSpecSchema.parse(input)).toEqual(parsed);
  });

  it('treats an undefined constant-size key as absent without accepting a concrete conflict', () => {
    expect(StrictSizeFieldChannelSchema.parse({ field: 'volume', value: undefined })).toEqual({ field: 'volume' });
    expect(() => StrictSizeFieldChannelSchema.parse({ field: 'volume', value: 8 })).toThrow();
  });

  it('keeps the Bubble patch strict at runtime', () => {
    expect(() => BubblePointPatchSchema.parse({ unknown: true })).toThrow();
  });
});
