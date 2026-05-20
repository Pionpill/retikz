import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SCHEMA_REGISTRY, lookupSchema } from '@/lib/schemaRegistry';
import {
  CoordinateSchema,
  MoveStepSchema,
  RelativeTargetSchema,
  SceneSchema,
} from '@retikz/core';

describe('SCHEMA_REGISTRY', () => {
  it('contains 31 entries (17 primary + 10 step variants + 2 target variants + 2 arrow detail variants)', () => {
    expect(Object.keys(SCHEMA_REGISTRY)).toHaveLength(31);
  });

  it('each entry has non-empty schema / label / url', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      expect(entry.url, name).toMatch(/^\/core\/reference\//);
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('Scene');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/core/reference/schema/entity#coordinate');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/core/reference/schema/path#move');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/core/reference/schema/path#relative');
  });

  it('returns undefined for unregistered schemas', () => {
    expect(lookupSchema(z.string())).toBeUndefined();
  });
});
