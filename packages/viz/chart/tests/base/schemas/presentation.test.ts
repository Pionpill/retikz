import { describe, expect, it } from 'vitest';

import {
  ChartPresentationItemKey,
  ChartPresentationPreset,
  ChartPresentationSchema,
  ChartPresentationTextSchema,
} from '../../../src/_shared/presentation';

describe('canonical Chart presentation schema', () => {
  it('exposes exactly four presets and fixed keys', () => {
    expect(ChartPresentationPreset).toEqual({
      Title: 'title',
      Subtitle: 'subtitle',
      Note: 'note',
      Source: 'source',
    });
    expect(ChartPresentationItemKey).toEqual({
      Plot: 'chart.plot',
      Title: 'chart.presentation.title',
      Subtitle: 'chart.presentation.subtitle',
      Note: 'chart.presentation.note',
      Source: 'chart.presentation.source',
    });
  });

  it('preserves canonical authored order with exactly one Plot', () => {
    const input = {
      children: [
        { kind: 'preset', key: 'chart.presentation.subtitle', preset: 'subtitle', text: 'Scope' },
        { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Question' },
        { kind: 'plot', key: 'chart.plot' },
        { kind: 'preset', key: 'chart.presentation.source', preset: 'source', text: 'World Bank' },
        { kind: 'preset', key: 'chart.presentation.note', preset: 'note', text: 'Estimate' },
      ],
    } as const;

    expect(ChartPresentationSchema.parse(input)).toEqual(input);
  });

  it('rejects duplicate presets, wrong fixed keys, missing Plot, unknown fields, and empty text', () => {
    expect(() =>
      ChartPresentationSchema.parse({
        children: [
          { kind: 'plot', key: 'chart.plot' },
          { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'A' },
          { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'B' },
        ],
      }),
    ).toThrow();
    expect(() =>
      ChartPresentationSchema.parse({
        children: [{ kind: 'preset', key: 'chart.presentation.source', preset: 'title', text: 'A' }],
      }),
    ).toThrow();
    expect(() =>
      ChartPresentationSchema.parse({ children: [{ kind: 'plot', key: 'chart.plot' }], layout: {} }),
    ).toThrow();
    expect(() => ChartPresentationTextSchema.parse('')).toThrow();
  });
});
