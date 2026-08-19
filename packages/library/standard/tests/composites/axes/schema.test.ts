import { describe, expect, it } from 'vitest';

import { AxesSchema } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

describe('AxesSchema', () => {
  it('reuses the complete Core Scope authored surface', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      ...fullScopeProps,
      x: { extent: 20 },
      y: { extent: 20 },
    });

    expect(parsed).toMatchObject(fullScopeProps);
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('fills origin and per-axis defaults and remains JSON round-trippable', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 60 },
      y: { extent: { negative: 20, positive: 40 } },
    });

    expect(parsed).toMatchObject({
      origin: { position: [0, 0], label: false },
      x: { extent: 60, line: { arrows: 'positive' }, label: 'x' },
      y: { extent: { negative: 20, positive: 40 }, line: { arrows: 'positive' }, label: 'y' },
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('accepts independent axis, grid, tick-source, and static-label configurations', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      origin: {
        position: [100, 80],
        label: { text: 'O', offset: 5, style: { textColor: '#475569' } },
      },
      x: {
        extent: { negative: 40, positive: 60 },
        line: { arrows: 'negative', style: { stroke: '#334155' } },
        grid: { spacing: 20, offset: 5, style: { stroke: '#e2e8f0' } },
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
        extent: { negative: 20, positive: 40 },
        line: false,
        grid: false,
        ticks: {
          source: { kind: 'values', values: [-20, 20, 40] },
          endpointGap: 0,
          labels: { entries: [{ value: 40, text: '2' }] },
        },
        label: false,
      },
    });

    expect(parsed.x).toMatchObject({
      extent: { negative: 40, positive: 60 },
      line: { arrows: 'negative' },
      grid: { spacing: 20, offset: 5 },
      ticks: { source: { kind: 'spacing', extent: 'positive' }, side: 'positive', length: 6 },
      label: { end: 'negative', offset: 10 },
    });
    expect(parsed.y).toMatchObject({ extent: { negative: 20, positive: 40 }, line: false, grid: false, label: false });
    expect(parsed.origin.label).toMatchObject({ text: 'O', offset: 5 });
  });

  it('defaults tick segments to both sides of the axis with a six-unit endpoint gap', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-10, 10] } } },
      y: { extent: 20 },
    });

    expect(parsed.x).toMatchObject({ ticks: { side: 'both', endpointGap: 6, length: 6 } });
  });

  it('accepts a zero endpoint gap and rejects negative gaps', () => {
    const zeroGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-20, 20] }, endpointGap: 0 } },
      y: { extent: 20 },
    });
    const negativeGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-10, 10] }, endpointGap: -1 } },
      y: { extent: 20 },
    });

    expect(zeroGap.success).toBe(true);
    expect(negativeGap.success).toBe(false);
    if (!negativeGap.success) expect(negativeGap.error.issues[0]?.path).toEqual(['x', 'ticks', 'endpointGap']);
  });

  it('parses axis-local grid offsets and Core-compatible arrow details', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 60,
        grid: { spacing: 20, offset: 5 },
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
      y: { extent: 40, grid: { spacing: 10, offset: -10 } },
    });

    expect(parsed.x.grid).toMatchObject({ spacing: 20, offset: 5 });
    expect(parsed.y.grid).toMatchObject({ spacing: 10, offset: -10 });
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

  it('defaults an axis grid offset and rejects invalid arrow details', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, grid: { spacing: 10 } },
      y: { extent: 20 },
    });
    const invalidArrow = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, line: { arrowDetail: { scale: 0 } } },
      y: { extent: 20 },
    });

    expect(parsed.x.grid).toMatchObject({ spacing: 10, offset: 0 });
    expect(invalidArrow.success).toBe(false);
    if (!invalidArrow.success)
      expect(invalidArrow.error.issues[0]?.path).toEqual(['x', 'line', 'arrowDetail', 'scale']);
  });

  it('rejects zero-length axes and hiding every axis artifact', () => {
    const zeroExtent = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: { negative: 0, positive: 0 } },
      y: { extent: 20 },
    });
    const noAxes = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, line: false, ticks: false, grid: false, label: false },
      y: { extent: 20, line: false, ticks: false, grid: false, label: false },
    });

    expect(zeroExtent.success).toBe(false);
    expect(noAxes.success).toBe(false);
    if (!zeroExtent.success) expect(zeroExtent.error.issues[0]?.path).toEqual(['x', 'extent']);
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
      x: { extent: 40, ticks: { source: { kind: 'values', values } } },
      y: { extent: 20 },
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(issuePath);
  });

  it('rejects tick labels that do not refer to emitted tick values', () => {
    const spacingLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 50,
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          labels: { entries: [{ value: -20, text: 'hidden side' }] },
        },
      },
      y: { extent: 20 },
    });
    const explicitLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 50,
        ticks: {
          source: { kind: 'values', values: [-20, 20] },
          labels: { entries: [{ value: 40, text: 'missing' }] },
        },
      },
      y: { extent: 20 },
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
      x: {
        extent: 20,
        ticks: {
          source: { kind: 'values', values: [15] },
          endpointGap: 6,
          labels: { entries: [{ value: 15, text: 'filtered' }] },
        },
      },
      y: { extent: 20 },
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
  });

  it('rejects unsafe lattice sizes and unknown legacy fields before lowering', () => {
    const excessiveTicks = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 1, ticks: { source: { kind: 'spacing', spacing: 0.000001 } } },
      y: { extent: 1 },
    });
    const unknownField = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20 },
      y: { extent: 20 },
      extent: { x: 20, y: 20 },
    });

    expect(excessiveTicks.success).toBe(false);
    expect(unknownField.success).toBe(false);
    if (!excessiveTicks.success)
      expect(excessiveTicks.error.issues[0]?.path).toEqual(['x', 'ticks', 'source', 'spacing']);
    if (!unknownField.success) expect(unknownField.error.issues[0]?.path).toEqual([]);
  });

  it('rejects false-axis forms', () => {
    const falseAxis = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: false,
      y: { extent: 20 },
    });

    expect(falseAxis.success).toBe(false);
  });
});
