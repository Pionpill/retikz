import { describe, expect, it } from 'vitest';

import { PointChartType } from '../../src/point';
import { BubbleChartSchema, BubblePointPatchSchema } from '../../src/point/bubble';
import { StrictSizeFieldChannelSchema } from '../../src/point/shared';

const minimalBubble = {
  namespace: 'chart',
  type: 'bubble',
  plot: {
    data: { reference: 'rows' },
  },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
      size: { field: 'volume' },
    },
  },
} as const;

describe('Bubble Chart schema', () => {
  it('parses and round-trips a distinct Bubble variant', () => {
    const parsed = BubbleChartSchema.parse(minimalBubble);

    expect(PointChartType.Bubble).toBe('bubble');
    expect(parsed.type).toBe('bubble');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('accepts datum labels and non-reserved Point capabilities', () => {
    expect(
      BubbleChartSchema.parse({
        ...minimalBubble,
        config: {
          encoding: {
            ...minimalBubble.config.encoding,
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
        },
      }),
    ).toMatchObject({
      type: 'bubble',
      config: {
        mark: {
          label: { content: { field: 'name' } },
          encoding: { depth: { field: 'depth' } },
        },
      },
    });
  });

  it.each([
    [
      'missing required size',
      { ...minimalBubble, config: { encoding: { x: { field: 'amount' }, y: { field: 'margin' } } } },
    ],
    [
      'constant core size',
      {
        ...minimalBubble,
        config: { encoding: { ...minimalBubble.config.encoding, size: { value: 8 } } },
      },
    ],
    [
      'top-level mark size',
      { ...minimalBubble, config: { ...minimalBubble.config, mark: { size: { kind: 'constant', value: 8 } } } },
    ],
    [
      'nested mark size',
      { ...minimalBubble, config: { ...minimalBubble.config, mark: { encoding: { size: { field: 'otherVolume' } } } } },
    ],
    [
      'nested custom size',
      {
        ...minimalBubble,
        config: { ...minimalBubble.config, mark: { encoding: { channels: { size: { field: 'otherVolume' } } } } },
      },
    ],
    [
      'nested text mode',
      { ...minimalBubble, config: { ...minimalBubble.config, mark: { encoding: { text: { field: 'name' } } } } },
    ],
    [
      'nested x',
      { ...minimalBubble, config: { ...minimalBubble.config, mark: { encoding: { x: { field: 'otherX' } } } } },
    ],
    [
      'nested y',
      { ...minimalBubble, config: { ...minimalBubble.config, mark: { encoding: { y: { field: 'otherY' } } } } },
    ],
    ['unknown top-level key', { ...minimalBubble, unknown: true }],
    ['unknown mark key', { ...minimalBubble, config: { ...minimalBubble.config, mark: { unknown: true } } }],
  ])('rejects %s', (_label, input) => {
    expect(() => BubbleChartSchema.parse(input)).toThrow();
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
      config: {
        encoding: {
          ...minimalBubble.config.encoding,
          x: { field: 'amount', scale: undefined },
          size: { field: 'volume', scale: undefined, value: undefined },
          opacity: undefined,
        },
        mark: { opacity: undefined },
      },
    };
    const parsed = BubbleChartSchema.parse(input);

    expect(Object.hasOwn(parsed, 'id')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding, 'opacity')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.x, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.size, 'scale')).toBe(false);
    expect(Object.hasOwn(parsed.config.encoding.size, 'value')).toBe(false);
    expect(parsed.config.mark).toEqual({});
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('treats an undefined constant-size key as absent without accepting a concrete conflict', () => {
    expect(StrictSizeFieldChannelSchema.parse({ field: 'volume', value: undefined })).toEqual({ field: 'volume' });
    expect(() => StrictSizeFieldChannelSchema.parse({ field: 'volume', value: 8 })).toThrow();
  });

  it('keeps the Bubble patch strict at runtime', () => {
    expect(() => BubblePointPatchSchema.parse({ unknown: true })).toThrow();
  });
});
