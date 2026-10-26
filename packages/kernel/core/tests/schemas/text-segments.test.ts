import { describe, expect, it } from 'vitest';

import {
  LineSchema,
  MathSegmentSchema,
  SegmentedLineSchema,
  NodeSchema,
  TextSegmentSchema,
  NodeLabelSchema,
  PathLabelSchema,
} from '../../src/schemas';

describe('label text blocks', () => {
  it.each([NodeLabelSchema, PathLabelSchema])('accepts the shared text block and rejects non-block inputs', schema => {
    const text = ['first', { text: 'second', fill: '#f00' }, { segments: [{ text: 'third' }] }];
    expect(schema.parse({ text }).text).toEqual(text);
    expect(schema.safeParse({ text: [] }).success).toBe(false);
    expect(schema.safeParse({ text: { segments: [{ text: 'old' }] } }).success).toBe(false);
  });
});

describe('[text-segments] segment schemas', () => {
  it('accepts a text segment with per-segment style', () => {
    expect(TextSegmentSchema.safeParse({ text: 'E=', fill: '#f00', opacity: 0.8 }).success).toBe(true);
  });

  it('accepts a math segment with tex / displayMode / fill', () => {
    expect(MathSegmentSchema.safeParse({ tex: 'mc^2', displayMode: true, fill: '#00f' }).success).toBe(true);
  });

  it('rejects a segment carrying both text and tex (strict)', () => {
    expect(TextSegmentSchema.safeParse({ text: 'x', tex: 'y' }).success).toBe(false);
    expect(MathSegmentSchema.safeParse({ tex: 'y', text: 'x' }).success).toBe(false);
  });

  it('accepts a mixed line of text + math segments', () => {
    expect(SegmentedLineSchema.safeParse({ segments: [{ text: 'when ' }, { tex: 'v=d/t' }] }).success).toBe(true);
  });

  it('rejects an empty segments array', () => {
    expect(SegmentedLineSchema.safeParse({ segments: [] }).success).toBe(false);
  });

  it('admits a mixed line as a IRLine', () => {
    expect(LineSchema.safeParse({ segments: [{ tex: 'x' }] }).success).toBe(true);
  });

  it('round-trips a node whose text is an explicit segment sequence', () => {
    const node = NodeSchema.parse({
      type: 'node',
      id: 'eq',
      position: [0, 0],
      text: [
        {
          segments: [
            { text: 'E=', opacity: 0.9 },
            { tex: 'mc^2', displayMode: false },
          ],
        },
      ],
    });

    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });
});
