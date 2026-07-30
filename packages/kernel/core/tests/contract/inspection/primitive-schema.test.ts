import { describe, expect, it } from 'vitest';

import { InspectionPlaneSchema, InspectionPrimitiveSchema } from '../../../src';

const occurrence = {
  sourcePath: 'children[0]',
  expansionPath: [],
} as const;

describe('inspection primitive schemas', () => {
  it('accepts the renderer-neutral rect, line, label, entry, and plane DTOs', () => {
    const primitives = [
      {
        kind: 'rect',
        role: 'layout.container',
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        presentation: 'outline',
        tone: 'neutral',
        lineStyle: 'solid',
      },
      {
        kind: 'line',
        role: 'layout.guide',
        x1: 0,
        y1: 20,
        x2: 100,
        y2: 20,
        tone: 'guide',
        lineStyle: 'dashed',
        opacity: 0.5,
      },
      {
        kind: 'label',
        role: 'layout.label',
        x: 4,
        y: 8,
        text: 'slot 100×40',
        tone: 'accent',
      },
    ] as const;

    primitives.forEach(primitive => expect(InspectionPrimitiveSchema.parse(primitive)).toEqual(primitive));
    expect(
      InspectionPlaneSchema.parse({
        entries: [{ occurrence, transform: [1, 0, 0, 1, 12, 24], primitives }],
      }),
    ).toMatchObject({ entries: [{ occurrence }] });
  });

  it('rejects authored Scene semantics and invalid numeric bounds', () => {
    expect(() =>
      InspectionPrimitiveSchema.parse({
        kind: 'rect',
        role: 'layout.container',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        presentation: 'outline',
        tone: 'neutral',
        id: 'forbidden',
      }),
    ).toThrow();
    expect(() =>
      InspectionPrimitiveSchema.parse({
        kind: 'line',
        role: 'layout.guide',
        x1: Number.POSITIVE_INFINITY,
        y1: 0,
        x2: 10,
        y2: 0,
        tone: 'guide',
        lineStyle: 'solid',
      }),
    ).toThrow();
    expect(() =>
      InspectionPrimitiveSchema.parse({
        kind: 'rect',
        role: 'layout.container',
        x: 0,
        y: 0,
        width: -1,
        height: 10,
        presentation: 'fill',
        tone: 'warning',
      }),
    ).toThrow();
    expect(() =>
      InspectionPrimitiveSchema.parse({
        kind: 'label',
        role: 'layout.label',
        x: 0,
        y: 0,
        text: 'x'.repeat(129),
        tone: 'accent',
      }),
    ).toThrow();
  });

  it('rejects invalid plane transforms and occurrence fields', () => {
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [{ occurrence, transform: [1, 0, 0, 1, Number.NaN, 0], primitives: [] }],
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [{ occurrence: { ...occurrence, owner: 'x' }, transform: [1, 0, 0, 1, 0, 0], primitives: [] }],
      }),
    ).toThrow();
  });
});
