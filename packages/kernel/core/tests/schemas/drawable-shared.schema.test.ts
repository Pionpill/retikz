import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRDrawableInstance, IRDrawableSharedStyle, IRDrawableStyle } from '../../src';

import {
  DrawableInstanceSchema,
  DrawableStyleSchema,
  GeometryLabelSchema,
  PathSchema,
  StepLabelSchema,
} from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const fade = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 300,
};

const path = (overrides: Record<string, unknown> = {}) => ({
  type: 'path',
  children: steps,
  ...overrides,
});

describe('Drawable shared schema', () => {
  it('accepts shared drawable style and instance fields on stroke paths', () => {
    const parsed = PathSchema.parse(
      path({
        id: 'edge-a',
        color: 'crimson',
        fill: '#fee2e2',
        fillOpacity: 0.4,
        stroke: '#991b1b',
        strokeWidth: 2,
        strokeOpacity: 0.7,
        opacity: 0.8,
        shadow: 'md',
        blendMode: 'multiply',
        zIndex: 3,
        meta: { series: 'a' },
        animations: [fade],
      }),
    );

    expect(parsed).toMatchObject({
      id: 'edge-a',
      color: 'crimson',
      fill: '#fee2e2',
      stroke: '#991b1b',
      zIndex: 3,
      meta: { series: 'a' },
    });
  });

  it('accepts shared drawable style and instance fields on a custom path kind', () => {
    const parsed = PathSchema.parse(
      path({
        kind: 'custom',
        kindOptions: { width: 12 },
        id: 'flow-a',
        color: 'teal',
        fill: '#ccfbf1',
        fillOpacity: 0.5,
        stroke: '#0f766e',
        strokeWidth: 1.5,
        strokeOpacity: 0.75,
        opacity: 0.9,
        shadow: { offsetX: 1, offsetY: 2, blur: 3 },
        blendMode: 'screen',
        zIndex: 4,
        meta: { row: 1 },
        animations: [fade],
      }),
    );

    expect(parsed).toMatchObject({
      id: 'flow-a',
      color: 'teal',
      fill: '#ccfbf1',
      stroke: '#0f766e',
      zIndex: 4,
      meta: { row: 1 },
    });
  });

  it('keeps shared style type separate from instance fields except zIndex', () => {
    expectTypeOf<IRDrawableSharedStyle>().toMatchTypeOf<IRDrawableStyle>();
    expectTypeOf<IRDrawableSharedStyle>().toHaveProperty('zIndex').toEqualTypeOf<IRDrawableInstance['zIndex']>();
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('id');
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('meta');
    expectTypeOf<IRDrawableSharedStyle>().not.toHaveProperty('animations');
  });

  it('reuses geometry labels for step labels and path host labels', () => {
    const label = { text: '128', position: 0.75, placement: 'inside', sloped: true };

    expect(StepLabelSchema.parse(label)).toEqual(label);
    expect(PathSchema.parse(path({ label })).label).toEqual(label);
    expect(StepLabelSchema).toBe(GeometryLabelSchema);
  });

  it('keeps edge label sides canonical and rejects parser sugar aliases', () => {
    expect(GeometryLabelSchema.parse({ text: 'x', side: 'top' })).toMatchObject({ side: 'top' });
    expect(GeometryLabelSchema.parse({ text: 'x', side: 'bottom' })).toMatchObject({ side: 'bottom' });
    expect(() => GeometryLabelSchema.parse({ text: 'x', side: 'north' })).toThrow();
    expect(() => GeometryLabelSchema.parse({ text: 'x', side: 'above' })).toThrow();
  });

  it('rejects unknown fields nested in kind options only when the custom schema rejects them', () => {
    for (const field of ['dashPattern', 'arrow', 'arrowDetail', 'lineCap', 'lineJoin', 'roundedCorners']) {
      const value = field === 'dashPattern' ? [4, 2] : 'round';
      expect(PathSchema.safeParse(path({ kind: 'custom', kindOptions: { width: 12, [field]: value } })).success).toBe(
        true,
      );
    }
  });

  it('rejects unknown fields at the path host top level', () => {
    for (const field of ['width', 'start', 'end', 'interpolation', 'align', 'samples', 'sampling', 'upper', 'lower']) {
      expect(PathSchema.safeParse(path({ [field]: field === 'width' ? 12 : {} })).success).toBe(false);
    }
  });

  it('keeps instance fields out of the drawable style helper schema', () => {
    expect(DrawableStyleSchema.safeParse({ id: 'x' }).success).toBe(false);
    expect(DrawableStyleSchema.safeParse({ meta: { x: 1 } }).success).toBe(false);
    expect(DrawableStyleSchema.safeParse({ animations: [] }).success).toBe(false);
    expect(DrawableStyleSchema.safeParse({ zIndex: 1 }).success).toBe(false);
    expect(DrawableInstanceSchema.safeParse({ zIndex: 1, meta: { ok: true } }).success).toBe(true);
  });

  it('rejects private label fields', () => {
    expect(PathSchema.safeParse(path({ label: { text: 'x', side: 'upper' } })).success).toBe(false);
    expect(PathSchema.safeParse(path({ label: { text: 'x', rotate: 'sloped' } })).success).toBe(false);
  });

  it('keeps shared style schema JSON round-trippable', () => {
    const style = {
      color: '#0f172a',
      fill: '#e0f2fe',
      stroke: '#0369a1',
      strokeWidth: 2,
      opacity: 0.8,
      fillOpacity: 0.4,
      strokeOpacity: 0.6,
      shadow: 'sm',
      blendMode: 'multiply',
    };

    expect(DrawableStyleSchema.parse(JSON.parse(JSON.stringify(style)))).toEqual(style);
  });
});
