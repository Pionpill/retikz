import { describe, expect, it } from 'vitest';

import { AxesSchema } from '../../../src';

describe('AxesSchema', () => {
  it('fills stable per-axis defaults and remains JSON round-trippable', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 60, y: { negative: 20, positive: 40 } },
    });

    expect(parsed).toMatchObject({
      origin: [0, 0],
      x: { line: { arrows: 'positive' }, label: 'x' },
      y: { line: { arrows: 'positive' }, label: 'y' },
      originLabel: false,
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('accepts independent line, tick-source, and static-label configurations', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      origin: [100, 80],
      extent: {
        x: { negative: 40, positive: 60 },
        y: { negative: 20, positive: 40 },
      },
      x: {
        line: { arrows: 'negative', style: { stroke: '#334155' } },
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          side: 'positive',
          labels: {
            entries: [{ value: 20, text: '1' }],
            style: { textColor: '#0f172a', font: { size: 12 } },
          },
        },
        label: { text: 't', end: 'negative', offset: 10 },
      },
      y: {
        line: false,
        ticks: {
          source: { kind: 'values', values: [-20, 20, 40] },
          endpointGap: 0,
          labels: { entries: [{ value: 40, text: '2' }] },
        },
        label: false,
      },
      originLabel: { text: 'O', offset: 5, style: { textColor: '#475569' } },
    });

    expect(parsed.x).toMatchObject({
      line: { arrows: 'negative' },
      ticks: { source: { kind: 'spacing', extent: 'positive' }, side: 'positive', length: 6 },
      label: { end: 'negative', offset: 10 },
    });
    expect(parsed.y).toMatchObject({ line: false, label: false });
  });

  it('defaults tick segments to both sides of the axis with a six-unit endpoint gap', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: { ticks: { source: { kind: 'values', values: [-10, 10] } } },
    });

    expect(parsed.x).toMatchObject({ ticks: { side: 'both', endpointGap: 6, length: 6 } });
  });

  it('accepts a zero endpoint gap and rejects negative gaps', () => {
    const zeroGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: { ticks: { source: { kind: 'values', values: [-20, 20] }, endpointGap: 0 } },
    });
    const negativeGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: { ticks: { source: { kind: 'values', values: [-10, 10] }, endpointGap: -1 } },
    });

    expect(zeroGap.success).toBe(true);
    expect(negativeGap.success).toBe(false);
    if (!negativeGap.success) expect(negativeGap.error.issues[0]?.path).toEqual(['x', 'ticks', 'endpointGap']);
  });

  it('parses grid offsets and Core-compatible arrow details', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 60, y: 40 },
      grid: { spacing: 20, offset: [5, -10] },
      x: {
        line: {
          arrows: 'both',
          arrowDetail: {
            shape: 'openStealth',
            scale: 1.5,
            color: '#0f172a',
            start: { width: 8 },
            end: { length: 10, opacity: 0.7 },
          },
        },
      },
    });

    expect(parsed.grid).toMatchObject({ spacing: 20, offset: [5, -10] });
    expect(parsed.x).toMatchObject({
      line: {
        arrowDetail: {
          shape: 'openStealth',
          scale: 1.5,
          start: { width: 8 },
          end: { length: 10, opacity: 0.7 },
        },
      },
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('defaults the grid offset and rejects invalid arrow details', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      grid: { spacing: 10 },
    });
    const invalidArrow = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: { line: { arrowDetail: { scale: 0 } } },
    });

    expect(parsed.grid?.offset).toEqual([0, 0]);
    expect(invalidArrow.success).toBe(false);
    if (!invalidArrow.success)
      expect(invalidArrow.error.issues[0]?.path).toEqual(['x', 'line', 'arrowDetail', 'scale']);
  });

  it('rejects zero-length axes and disabling both axes', () => {
    const zeroExtent = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: { negative: 0, positive: 0 }, y: 20 },
    });
    const noAxes = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: false,
      y: false,
    });

    expect(zeroExtent.success).toBe(false);
    expect(noAxes.success).toBe(false);
    if (!zeroExtent.success) expect(zeroExtent.error.issues[0]?.path).toEqual(['extent', 'x']);
    if (!noAxes.success) expect(noAxes.error.issues[0]?.path).toEqual(['x']);
  });

  it.each([
    { values: [-20, 0, 20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [-20, -20, 20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [20, -20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [-60, 20], issuePath: ['x', 'ticks', 'source', 'values', 0] },
  ])('rejects invalid explicit tick values $values', ({ values, issuePath }) => {
    const parsed = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 40, y: 20 },
      x: { ticks: { source: { kind: 'values', values } } },
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(issuePath);
  });

  it('rejects tick labels that do not refer to emitted tick values', () => {
    const spacingLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 50, y: 20 },
      x: {
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          labels: { entries: [{ value: -20, text: 'hidden side' }] },
        },
      },
    });
    const explicitLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 50, y: 20 },
      x: {
        ticks: {
          source: { kind: 'values', values: [-20, 20] },
          labels: { entries: [{ value: 40, text: 'missing' }] },
        },
      },
    });

    expect(spacingLabel.success).toBe(false);
    expect(explicitLabel.success).toBe(false);
    if (!spacingLabel.success)
      expect(spacingLabel.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
    if (!explicitLabel.success)
      expect(explicitLabel.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
  });

  it('rejects tick labels whose tick is filtered by the endpoint gap', () => {
    const parsed = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: {
        ticks: {
          source: { kind: 'values', values: [15] },
          endpointGap: 6,
          labels: { entries: [{ value: 15, text: 'filtered' }] },
        },
      },
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
  });

  it('rejects unsafe lattice sizes and unknown fields before lowering', () => {
    const excessiveTicks = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 1, y: 1 },
      x: { ticks: { source: { kind: 'spacing', spacing: 0.000001 } } },
    });
    const unknownField = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      extent: { x: 20, y: 20 },
      x: { ticks: { source: { kind: 'spacing', spacing: 10 }, size: 4 } },
    });

    expect(excessiveTicks.success).toBe(false);
    expect(unknownField.success).toBe(false);
    if (!excessiveTicks.success)
      expect(excessiveTicks.error.issues[0]?.path).toEqual(['x', 'ticks', 'source', 'spacing']);
    if (!unknownField.success) expect(unknownField.error.issues[0]?.path).toEqual(['x']);
  });
});
