import { CoordinateSchema, MoveStepSchema, RelativeTargetSchema, SceneSchema } from '@retikz/core';
import {
  CoordinateSchema as PlotCoordinateSchema,
  EncodingSchema,
  GuideSchema,
  MarkSchema,
  PlotLayerSchema,
  PlotLayoutSchema,
  PlotSpecSchema,
  PlotThemeSchema,
  ScaleSchema,
  TransformSchema,
} from '@retikz/plot';
import { TableSpecSchema } from '@retikz/table';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lookupSchema, SCHEMA_REGISTRY } from '@/modules/docs/components';

describe('SCHEMA_REGISTRY', () => {
  it('contains the documented Kernel, Table, and Plot schema surfaces', () => {
    expect(SCHEMA_REGISTRY).toMatchObject({
      SceneSchema: { schema: SceneSchema },
      TableSpecSchema: { schema: TableSpecSchema },
      PlotSpecSchema: { schema: PlotSpecSchema },
      EncodingSchema: { schema: EncodingSchema },
      PlotTransformSchema: { schema: TransformSchema },
      MarkSchema: { schema: MarkSchema },
      ScaleSchema: { schema: ScaleSchema },
      PlotCoordinateSchema: { schema: PlotCoordinateSchema },
      GuideSchema: { schema: GuideSchema },
      PlotLayoutSchema: { schema: PlotLayoutSchema },
      PlotLayerSchema: { schema: PlotLayerSchema },
      PlotThemeSchema: { schema: PlotThemeSchema },
    });
  });

  it('each entry has non-empty schema / label / url', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      expect(entry.url, name).toMatch(/^\/.+\/(?:reference|contract)\/.+/);
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('Scene');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/kernel/reference/schema/entity#coordinate');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/reference/schema/path#move');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/kernel/reference/schema/path#relative');
    expect(lookupSchema(TableSpecSchema)?.url).toBe('/viz/table/reference/contract-table#tablespecschema');
  });

  it('keeps every Plot contract registry URL on a documented English heading', () => {
    const entries = Object.entries(SCHEMA_REGISTRY).filter(([, entry]) => entry.url.startsWith('/viz/plot/reference/'));

    for (const [name, entry] of entries) {
      const [route, anchor] = entry.url.split('#');
      expect(anchor, name).toBeTruthy();
      const source = readFileSync(
        resolve(process.cwd(), 'src/modules/docs/contents', route.slice(1), 'index.en.mdx'),
        'utf8',
      );
      const headingAnchors = Array.from(source.matchAll(/^#{2,6}\s+(.+)$/gm), match =>
        match[1].toLowerCase().replaceAll(/[^a-z0-9]/g, ''),
      );

      expect(headingAnchors, `${name} -> ${entry.url}`).toContain(anchor);
    }
  });

  it('returns undefined for unregistered schemas', () => {
    expect(lookupSchema(z.string())).toBeUndefined();
  });
});
