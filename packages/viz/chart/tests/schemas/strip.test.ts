import { describe, expect, it } from 'vitest';

import {
  StripChartEncodingsSchema,
  StripChartMarkSchema,
  StripChartPropertiesSchema,
  StripChartSchema,
} from '../../src/point/strip';

const strip = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'strip',
    encodings: {
      x: {
        field: 'category',
        scale: { operation: { type: 'point', name: 'category' } },
      },
      y: {
        field: 'value',
        scale: { operation: { type: 'linear', name: 'value' } },
      },
    },
  },
} as const;

describe('Strip Chart exact Source schema', () => {
  it('parses direct position mappings and round-trips JSON', () => {
    const parsed = StripChartSchema.parse(strip);

    expect(parsed).toEqual(strip);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it('accepts only direct field mappings for every encoding role', () => {
    expect(
      StripChartEncodingsSchema.safeParse({
        x: 'category',
        y: 'value',
        color: { field: 'group' },
        size: { field: 'weight', scale: { operation: { type: 'sqrt', name: 'size' } } },
        opacity: { field: 'confidence', scale: { operation: { type: 'linear', name: 'opacity' } } },
        shape: { field: 'shape' },
      }).success,
    ).toBe(true);

    for (const encodings of [
      { x: { aggregate: { kind: 'mean', field: 'value', as: 'mean' } }, y: 'value' },
      { x: 'category', y: { transform: { kind: 'bin', field: 'value', as: 'bin' }, output: 'bin' } },
      { x: 'category', y: 'value', color: { aggregate: { kind: 'count', as: 'count' } } },
      { x: 'category', y: 'value', facet: { empty: 'show' } },
      { x: 'category', y: 'value', series: 'series' },
    ]) {
      expect(StripChartEncodingsSchema.safeParse(encodings).success).toBe(false);
    }
  });

  it('validates jitter total span, seed, and continuous domain padding', () => {
    for (const properties of [
      { jitter: { span: 0, seed: 0 } },
      { jitter: { span: 24, seed: -3.5 } },
      { jitter: { distribution: { kind: 'uniform' } } },
      { jitter: { distribution: { kind: 'normal' } } },
      { jitter: { distribution: { kind: 'normal', sigma: 0.75 } } },
      { jitter: { span: { kind: 'ratio', value: 0 } } },
      { jitter: { span: { kind: 'ratio', value: 1 } } },
      { domainPadding: 0 },
      { domainPadding: { kind: 'ratio', y: 0.05 } },
    ]) {
      expect(StripChartPropertiesSchema.safeParse(properties).success).toBe(true);
    }

    for (const properties of [
      { jitter: { span: -0.01 } },
      { jitter: { span: { kind: 'ratio', value: -0.01 } } },
      { jitter: { span: { kind: 'ratio', value: 1.01 } } },
      { jitter: { distribution: { kind: 'normal', sigma: 0 } } },
      { jitter: { distribution: { kind: 'normal', sigma: -1 } } },
      { jitter: { distribution: { kind: 'uniform', sigma: 0.5 } } },
      { jitter: { role: 'x' } },
      { jitter: { unknown: true } },
    ]) {
      expect(StripChartPropertiesSchema.safeParse(properties).success).toBe(false);
    }
  });

  it('keeps authored mark encodings field-only and excludes scale-level properties', () => {
    expect(
      StripChartMarkSchema.safeParse({
        kind: 'strip',
        override: true,
        encodings: { x: 'alternateCategory', color: 'alternateGroup' },
        properties: { size: 0, jitter: { span: 0, seed: 0, distribution: { kind: 'normal', sigma: 0.5 } } },
      }).success,
    ).toBe(true);

    for (const mark of [
      { kind: 'strip', encodings: { x: { field: 'category' } } },
      { kind: 'strip', encodings: { x: { field: 'category', scale: { reference: 'other' } } } },
      { kind: 'strip', properties: { domainPadding: 8 } },
      { kind: 'strip', properties: { jitter: { role: 'x' } } },
    ]) {
      expect(StripChartMarkSchema.safeParse(mark).success).toBe(false);
    }
  });

  it('rejects missing position roles and unknown recipe fields', () => {
    expect(
      StripChartSchema.safeParse({
        ...strip,
        recipe: { chartType: 'strip', encodings: { x: 'category' } },
      }).success,
    ).toBe(false);
    expect(
      StripChartSchema.safeParse({
        ...strip,
        recipe: { ...strip.recipe, encodings: { x: ' ', y: 'value' } },
      }).success,
    ).toBe(false);
    expect(
      StripChartSchema.safeParse({
        ...strip,
        recipe: { ...strip.recipe, unknown: true },
      }).success,
    ).toBe(false);
  });
});
