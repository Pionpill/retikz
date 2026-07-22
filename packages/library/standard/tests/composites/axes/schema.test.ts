import { describe, expect, it } from 'vitest';

import { AxesSchema } from '../../../src';

describe('AxesSchema', () => {
  it('fills the stable axis, tick-label, and origin defaults', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -6, max: 6 }, y: { min: -4, max: 4 } },
    });

    expect(parsed).toMatchObject({
      origin: [0, 0],
      axes: { arrows: 'positive' },
      labels: { x: 'x', y: 'y' },
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('accepts shared and directional grid styles as closed objects', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -2, max: 2 }, y: { min: -1, max: 1 } },
      grid: {
        spacing: { x: 1, y: 0.5 },
        style: { stroke: '#e2e8f0', strokeWidth: 0.5 },
        vertical: { stroke: '#cbd5e1' },
        horizontal: { dashPattern: [4, 2] },
      },
    });

    expect(parsed.grid?.vertical).toEqual({ stroke: '#cbd5e1' });
    expect(parsed.grid?.horizontal).toEqual({ dashPattern: [4, 2] });
  });

  it('rejects invalid ranges, out-of-range origins, nonpositive intervals, and unknown fields precisely', () => {
    const invalidBounds = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: 1, max: 1 }, y: { min: -1, max: 1 } },
    });
    const invalidOrigin = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      origin: [2, 0],
    });
    const invalidTick = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      ticks: { x: 0 },
    });
    const unknownStyle = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      grid: { spacing: 1, horizontal: { strokeDasharray: '4 2' } },
    });

    expect(invalidBounds.success).toBe(false);
    expect(invalidOrigin.success).toBe(false);
    expect(invalidTick.success).toBe(false);
    expect(unknownStyle.success).toBe(false);
    if (!invalidOrigin.success) expect(invalidOrigin.error.issues[0]?.path).toEqual(['origin', 0]);
    if (!invalidTick.success) expect(invalidTick.error.issues[0]?.path).toEqual(['ticks', 'x']);
    if (!unknownStyle.success) expect(unknownStyle.error.issues[0]?.path).toEqual(['grid', 'horizontal']);
  });

  it('rejects unsafe or excessive grid and tick lattice sizes before lowering', () => {
    const unsafeGrid = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } },
      grid: { spacing: Number.MIN_VALUE },
    });
    const excessiveTicks = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      bounds: { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } },
      ticks: { x: 0.000001 },
    });

    expect(unsafeGrid.success).toBe(false);
    expect(excessiveTicks.success).toBe(false);
    if (!unsafeGrid.success) expect(unsafeGrid.error.issues[0]?.path).toEqual(['grid', 'spacing']);
    if (!excessiveTicks.success) expect(excessiveTicks.error.issues[0]?.path).toEqual(['ticks', 'x']);
  });
});
