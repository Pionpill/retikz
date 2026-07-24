import { AxisLineStepSchema, CoordinateSchema, MoveStepSchema, RelativeTargetSchema, SceneSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lookupSchema, SCHEMA_REGISTRY } from '@/modules/docs/components';

describe('SCHEMA_REGISTRY', () => {
  it('contains the documented core schema surface', () => {
    expect(Object.keys(SCHEMA_REGISTRY)).toHaveLength(82);
  });

  it('each entry has non-empty schema / label / url', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      expect(entry.url, name).toMatch(/^\/kernel\/reference\//);
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('Scene');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/kernel/reference/schema/entity#coordinate');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/reference/schema/path#move');
    expect(lookupSchema(AxisLineStepSchema)?.url).toBe('/kernel/reference/schema/path#axis-line');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/kernel/reference/schema/path#relative');
  });

  it('returns undefined for unregistered schemas', () => {
    expect(lookupSchema(z.string())).toBeUndefined();
  });
});
