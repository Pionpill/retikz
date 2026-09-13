import { describe, expect, it } from 'vitest';

import {
  ClipInspectOptionsSchema,
  CoordinateInspectOptionsSchema,
  NodeInspectOptionsSchema,
  PathInspectOptionsSchema,
  ScopeInspectOptionsSchema,
} from '../../src';

const schemas = [
  [
    'node',
    NodeInspectOptionsSchema,
    {
      outline: true,
      boundary: true,
      box: true,
      bounds: true,
      content: true,
      baselines: true,
      keyPoints: true,
      labels: true,
    },
  ],
  ['clip', ClipInspectOptionsSchema, { outline: true, labels: false }],
  ['scope', ScopeInspectOptionsSchema, { envelope: true, origin: true, axes: false, labels: false }],
  ['coordinate', CoordinateInspectOptionsSchema, { labels: false }],
  [
    'path',
    PathInspectOptionsSchema,
    {
      controlPoints: true,
      vertices: false,
      arcGeometry: true,
      ellipseAxes: false,
      labels: false,
    },
  ],
] as const;

describe('builtin Inspector options schemas', () => {
  it.each(schemas)('materializes %s defaults and survives JSON round-trip', (_name, schema, expected) => {
    const parsed = schema.parse({});
    expect(parsed).toEqual(expected);
    expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(expected);
  });

  it.each(schemas)('rejects unknown fields for %s', (_name, schema) => {
    expect(() => schema.parse({ unknown: true })).toThrow();
  });
});
