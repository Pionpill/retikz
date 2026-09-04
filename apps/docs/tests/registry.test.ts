import {
  AxisLineStepSchema,
  ContextualColorSchema,
  CoordinateSchema,
  MoveStepSchema,
  RelativeTargetSchema,
  SceneSchema,
} from '@retikz/core';
import {
  BlockHeaderSchema,
  BlockRowSchema,
  BlockSchema,
  BlockSectionSchema,
  EntitySchema,
  RelationSchema,
} from '@retikz/graph';
import { LayoutInspectSpacingOptionsInputSchema } from '@retikz/layout/inspect';
import {
  CoordinateSchema as PlotCoordinateSchema,
  EncodingSchema,
  GuideSchema,
  MarkSchema,
  PlotAreaThemeSchema,
  PlotLayerSchema,
  PlotSchema,
  PlotThemeSchema,
  ScaleSchema,
  TransformSchema,
} from '@retikz/plot';
import { LegendArtifactSchema, LegendSchema, SurfaceSchema } from '@retikz/standard';
import { TableSchema } from '@retikz/table';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lookupSchema, SCHEMA_REGISTRY } from '@/modules/docs/components';

describe('SCHEMA_REGISTRY', () => {
  it('contains the documented Kernel, Table, and Plot schema surfaces', () => {
    expect(SCHEMA_REGISTRY).toMatchObject({
      SceneSchema: { schema: SceneSchema },
      ContextualColorSchema: {
        schema: ContextualColorSchema,
        url: '/kernel/reference/schema/style#contextualcolorschema',
      },
      LayoutInspectSpacingOptionsInputSchema: { schema: LayoutInspectSpacingOptionsInputSchema },
      TableSchema: { schema: TableSchema },
      PlotSchema: { schema: PlotSchema },
      EncodingSchema: { schema: EncodingSchema },
      PlotTransformSchema: { schema: TransformSchema },
      MarkSchema: { schema: MarkSchema },
      ScaleSchema: { schema: ScaleSchema },
      PlotCoordinateSchema: { schema: PlotCoordinateSchema },
      GuideSchema: { schema: GuideSchema },
      PlotLayerSchema: { schema: PlotLayerSchema },
      PlotAreaThemeSchema: { schema: PlotAreaThemeSchema },
      PlotThemeSchema: { schema: PlotThemeSchema },
      LegendSchema: {
        schema: LegendSchema,
        url: '/library/standard/composite/legend#legendschema',
      },
      LegendArtifactSchema: {
        schema: LegendArtifactSchema,
        url: '/library/standard/composite/legend#legendartifactschema',
      },
      SurfaceSchema: {
        schema: SurfaceSchema,
        url: '/library/standard/composite/surface#surfaceschema',
      },
      BlockSchema: { schema: BlockSchema, url: '/schematic/graph/block/basic' },
      BlockHeaderSchema: { schema: BlockHeaderSchema, url: '/schematic/graph/block/basic' },
      BlockSectionSchema: { schema: BlockSectionSchema, url: '/schematic/graph/block/basic' },
      BlockRowSchema: { schema: BlockRowSchema, url: '/schematic/graph/block/basic' },
      EntitySchema: { schema: EntitySchema, url: '/schematic/graph/api-reference' },
      RelationSchema: { schema: RelationSchema, url: '/schematic/graph/api-reference' },
    });
  });

  it('each entry has non-empty schema / label / url', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      expect(entry.url, name).toMatch(
        /^\/.+\/(?:(?:reference|contract|composite|extension|graph)\/.+|flow\/basic(?:#.+)?)$/,
      );
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('Scene');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/kernel/reference/schema/entity#coordinate');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/reference/schema/path#move');
    expect(lookupSchema(AxisLineStepSchema)?.url).toBe('/kernel/reference/schema/path#axis-line');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/kernel/reference/schema/path#relative');
    expect(lookupSchema(LayoutInspectSpacingOptionsInputSchema)?.url).toBe(
      '/library/layout/reference/runtime#layoutinspectspacingoptionsinputschema',
    );
    expect(lookupSchema(TableSchema)?.url).toBe('/viz/table/reference/contract-table#tableschema');
    expect(lookupSchema(LegendSchema)?.url).toBe('/library/standard/composite/legend#legendschema');
    expect(lookupSchema(LegendArtifactSchema)?.url).toBe('/library/standard/composite/legend#legendartifactschema');
    expect(lookupSchema(SurfaceSchema)?.url).toBe('/library/standard/composite/surface#surfaceschema');
  });

  it('documents the Layout Inspector spacing schema on the Layout runtime reference page', () => {
    const referenceRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/layout/reference/runtime');
    const zhSource = readFileSync(resolve(referenceRoot, 'index.zh.mdx'), 'utf8');
    const enSource = readFileSync(resolve(referenceRoot, 'index.en.mdx'), 'utf8');

    expect(zhSource).toContain('### LayoutInspectSpacingOptionsInputSchema');
    expect(zhSource).toContain('<ZodSchema\n  name="LayoutInspectSpacingOptionsInputSchema"');
    expect(zhSource).toContain("padding: '是否为容器已解析的 padding 绘制阴影。'");
    expect(zhSource).toContain("margin: '是否为子项已解析的 margin 绘制阴影。'");
    expect(enSource).toContain('### LayoutInspectSpacingOptionsInputSchema');
    expect(enSource).toContain('<ZodSchema name="LayoutInspectSpacingOptionsInputSchema" />');
  });

  it.each(['table', 'plot'] as const)(
    'keeps every Viz %s contract registry URL on a documented English heading',
    moduleId => {
      const entries = Object.entries(SCHEMA_REGISTRY).filter(([, entry]) =>
        entry.url.startsWith(`/viz/${moduleId}/reference/`),
      );

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
    },
  );

  it('keeps every Standard composite registry URL on a documented English heading', () => {
    const entries = Object.entries(SCHEMA_REGISTRY).filter(([, entry]) =>
      entry.url.startsWith('/library/standard/composite/'),
    );

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
