import { AxisLineStepSchema, CoordinateSchema, MoveStepSchema, RelativeTargetSchema, SceneSchema } from '@retikz/core';
import { TableSpecSchema } from '@retikz/table';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lookupSchema, SCHEMA_REGISTRY } from '@/modules/docs/components';

describe('SCHEMA_REGISTRY', () => {
  it('contains the documented Kernel and Table schema surfaces', () => {
    expect(SCHEMA_REGISTRY).toMatchObject({
      SceneSchema: { schema: SceneSchema },
      TableSpecSchema: { schema: TableSpecSchema },
    });
  });

  it('each entry has non-empty schema / label / url', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      expect(entry.url, name).toMatch(/^\/.+\/reference\/.+/);
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('Scene');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/kernel/reference/schema/entity#coordinate');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/reference/schema/path#move');
    expect(lookupSchema(AxisLineStepSchema)?.url).toBe('/kernel/reference/schema/path#axis-line');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/kernel/reference/schema/path#relative');
    expect(lookupSchema(TableSpecSchema)?.url).toBe('/viz/table/reference/contract-table#tablespecschema');
  });

  it('returns undefined for unregistered schemas', () => {
    expect(lookupSchema(z.string())).toBeUndefined();
  });
});
