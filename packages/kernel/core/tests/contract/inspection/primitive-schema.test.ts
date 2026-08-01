import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  InspectionFillPatternSchema,
  InspectionLabelPrimitiveSchema,
  InspectionLinePrimitiveSchema,
  InspectionLineStyleSchema,
  InspectionPlaneEntrySchema,
  InspectionPlaneSchema,
  InspectionPrimitiveSchema,
  InspectionRectPrimitiveSchema,
  InspectionToneSchema,
} from '../../../src';

const occurrence = {
  sourcePath: 'children[0]',
  expansionPath: [],
} as const;

const collectUndescribedProperties = (value: unknown, path = 'root'): Array<string> => {
  if (typeof value !== 'object' || value === null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectUndescribedProperties(item, `${path}[${index}]`));
  }

  const record = value as Record<string, unknown>;
  const properties = record.properties;
  const missing =
    typeof properties === 'object' && properties !== null && !Array.isArray(properties)
      ? Object.entries(properties as Record<string, unknown>).flatMap(([name, property]) => {
          if (typeof property !== 'object' || property === null || Array.isArray(property)) return [`${path}.${name}`];
          const description = (property as Record<string, unknown>).description;
          return typeof description === 'string' && description.length > 0 ? [] : [`${path}.${name}`];
        })
      : [];

  return [
    ...missing,
    ...Object.entries(record).flatMap(([name, child]) => collectUndescribedProperties(child, `${path}.${name}`)),
  ];
};

describe('inspection primitive schemas', () => {
  it('describes every public schema and field for schema reference consumers', () => {
    const schemas = [
      InspectionToneSchema,
      InspectionFillPatternSchema,
      InspectionLineStyleSchema,
      InspectionRectPrimitiveSchema,
      InspectionLinePrimitiveSchema,
      InspectionLabelPrimitiveSchema,
      InspectionPrimitiveSchema,
      InspectionPlaneEntrySchema,
      InspectionPlaneSchema,
    ];
    const jsonSchema = z.toJSONSchema(InspectionPlaneSchema, { unrepresentable: 'any' });

    expect(schemas.every(schema => typeof schema.description === 'string' && schema.description.length > 0)).toBe(true);
    expect(collectUndescribedProperties(jsonSchema)).toEqual([]);
  });

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
        tone: 'scope',
        lineStyle: 'solid',
      },
      {
        kind: 'line',
        role: 'layout.guide',
        x1: 0,
        y1: 20,
        x2: 100,
        y2: 20,
        tone: 'scope',
        lineStyle: 'dashed',
        opacity: 0.5,
      },
      {
        kind: 'label',
        role: 'layout.label',
        x: 4,
        y: 8,
        text: 'slot 100×40',
        tone: 'scope',
      },
      {
        kind: 'rect',
        role: 'layout.gap',
        x: 20,
        y: 0,
        width: 8,
        height: 40,
        presentation: 'fill',
        tone: 'scope',
        fillPattern: 'crosshatch',
      },
    ] as const;

    primitives.forEach(primitive => expect(InspectionPrimitiveSchema.parse(primitive)).toEqual(primitive));
    const plane = InspectionPlaneSchema.parse({
      entries: [{ occurrence, colorScope: 0, transform: [1, 0, 0, 1, 12, 24], primitives }],
    });
    expect(plane).toMatchObject({ entries: [{ occurrence }] });
    expect(InspectionPlaneSchema.parse(JSON.parse(JSON.stringify(plane)))).toEqual(plane);
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
        tone: 'scope',
        lineStyle: 'dashed',
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
        tone: 'scope',
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
        fillPattern: 'solid',
      }),
    ).toThrow();
    expect(() =>
      InspectionPrimitiveSchema.parse({
        kind: 'label',
        role: 'layout.label',
        x: 0,
        y: 0,
        text: 'x'.repeat(129),
        tone: 'scope',
      }),
    ).toThrow();
  });

  it('rejects mixed or incomplete rect presentations and legacy tones', () => {
    expect(() =>
      InspectionRectPrimitiveSchema.parse({
        kind: 'rect',
        role: 'layout.padding',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        presentation: 'outline',
        tone: 'scope',
        lineStyle: 'dashed',
        fillPattern: 'backward-diagonal',
      }),
    ).toThrow();
    expect(() =>
      InspectionRectPrimitiveSchema.parse({
        kind: 'rect',
        role: 'layout.padding',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        presentation: 'fill',
        tone: 'scope',
      }),
    ).toThrow();
    expect(() =>
      InspectionRectPrimitiveSchema.parse({
        kind: 'rect',
        role: 'layout.padding',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        presentation: 'fill',
        tone: 'scope',
        fillPattern: 'forward-diagonal',
        lineStyle: 'dashed',
      }),
    ).toThrow();
    expect(() => InspectionToneSchema.parse('neutral')).toThrow();
    expect(InspectionFillPatternSchema.options).toEqual([
      'solid',
      'forward-diagonal',
      'backward-diagonal',
      'crosshatch',
    ]);
  });

  it('rejects invalid plane transforms and occurrence fields', () => {
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [{ occurrence, colorScope: 0, transform: [1, 0, 0, 1, Number.NaN, 0], primitives: [] }],
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [
          {
            occurrence: { ...occurrence, owner: 'x' },
            colorScope: 0,
            transform: [1, 0, 0, 1, 0, 0],
            primitives: [],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [{ occurrence, colorScope: -1, transform: [1, 0, 0, 1, 0, 0], primitives: [] }],
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [{ occurrence, colorScope: 0.5, transform: [1, 0, 0, 1, 0, 0], primitives: [] }],
      }),
    ).toThrow();
    expect(() =>
      InspectionPlaneSchema.parse({
        entries: [
          {
            occurrence,
            colorScope: Number.MAX_SAFE_INTEGER + 1,
            transform: [1, 0, 0, 1, 0, 0],
            primitives: [],
          },
        ],
      }),
    ).toThrow();
  });
});
