import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
import { LayoutInspectSpacingOptionsSchema } from '@retikz/layout/inspect';
import {
  CoordinateSchema as PlotCoordinateSchema,
  EncodingSchema,
  GuideSchema,
  MarkSchema,
  PlotDefaultsSchema,
  PlotLayerSchema,
  PlotSchema,
  PlotThemeResolutionSchema,
  ScaleSchema,
  TransformSchema,
} from '@retikz/plot';
import { LegendArtifactSchema, LegendSchema, SurfaceSchema } from '@retikz/standard';
import { TableSchema } from '@retikz/table';
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
      LayoutInspectSpacingOptionsSchema: { schema: LayoutInspectSpacingOptionsSchema },
      TableSchema: { schema: TableSchema },
      PlotSchema: { schema: PlotSchema },
      EncodingSchema: { schema: EncodingSchema },
      PlotTransformSchema: { schema: TransformSchema },
      MarkSchema: { schema: MarkSchema },
      ScaleSchema: { schema: ScaleSchema },
      PlotCoordinateSchema: { schema: PlotCoordinateSchema },
      GuideSchema: { schema: GuideSchema },
      PlotLayerSchema: { schema: PlotLayerSchema },
      PlotDefaultsSchema: { schema: PlotDefaultsSchema },
      PlotThemeResolutionSchema: { schema: PlotThemeResolutionSchema },
      LegendSchema: {
        schema: LegendSchema,
        url: '/library/standard/legend#legendschema',
      },
      LegendArtifactSchema: {
        schema: LegendArtifactSchema,
        url: '/library/standard/legend#legendartifactschema',
      },
      SurfaceSchema: {
        schema: SurfaceSchema,
        url: '/library/standard/surface#surfaceschema',
      },
      BlockSchema: { schema: BlockSchema, url: '/schematic/graph/block/basic' },
      BlockHeaderSchema: { schema: BlockHeaderSchema, url: '/schematic/graph/block/basic' },
      BlockSectionSchema: { schema: BlockSectionSchema, url: '/schematic/graph/block/basic' },
      BlockRowSchema: { schema: BlockRowSchema, url: '/schematic/graph/block/basic' },
      EntitySchema: { schema: EntitySchema, url: '/schematic/graph/api-reference' },
      RelationSchema: { schema: RelationSchema, url: '/schematic/graph/api-reference' },
    });
  });

  it('each entry has a schema and label, with an optional documentation URL', () => {
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      expect(entry.schema, name).toBeDefined();
      expect(entry.label, name).toMatch(/^[A-Z]/);
      if (entry.url !== undefined) expect(entry.url, name).toMatch(/^\/.+/);
    }
  });

  it('lookupSchema resolves a registered schema by identity', () => {
    expect(lookupSchema(SceneSchema)?.label).toBe('SceneSchema');
    expect(lookupSchema(CoordinateSchema)?.url).toBe('/kernel/components/node/schema-reference#coordinateschema');
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/components/path/schema-reference#movestepschema');
    expect(lookupSchema(AxisLineStepSchema)?.url).toBe('/kernel/components/path/schema-reference#axislinestepschema');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBe('/kernel/reference/schema/path#relative');
    expect(lookupSchema(LayoutInspectSpacingOptionsSchema)?.url).toBe(
      '/library/layout/reference/runtime#layoutinspectspacingoptionsschema',
    );
    expect(lookupSchema(TableSchema)?.url).toBe('/viz/table/reference/contract-table#tableschema');
    expect(lookupSchema(LegendSchema)?.url).toBe('/library/standard/legend#legendschema');
    expect(lookupSchema(LegendArtifactSchema)?.url).toBe('/library/standard/legend#legendartifactschema');
    expect(lookupSchema(SurfaceSchema)?.url).toBe('/library/standard/surface#surfaceschema');
  });

  it('documents the Layout Inspector spacing schema on the Layout runtime reference page', () => {
    const referenceRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/layout/reference/runtime');
    const zhSource = readFileSync(resolve(referenceRoot, 'index.zh.mdx'), 'utf8');
    const enSource = readFileSync(resolve(referenceRoot, 'index.en.mdx'), 'utf8');

    expect(zhSource).toContain('### LayoutInspectSpacingOptionsSchema');
    expect(zhSource).toMatch(/<ZodSchema\s+name="LayoutInspectSpacingOptionsSchema"/);
    expect(zhSource).toContain("padding: '是否为容器已解析的 padding 绘制阴影。'");
    expect(zhSource).toContain("margin: '是否为子项已解析的 margin 绘制阴影。'");
    expect(enSource).toContain('### LayoutInspectSpacingOptionsSchema');
    expect(enSource).toContain('<ZodSchema name="LayoutInspectSpacingOptionsSchema" />');
  });

  it.each(['table', 'plot'] as const)(
    'keeps every Viz %s contract registry URL on a documented English heading',
    moduleId => {
      const entries = Object.entries(SCHEMA_REGISTRY).filter(([, entry]) =>
        entry.url?.startsWith(`/viz/${moduleId}/reference/`),
      );

      for (const [name, entry] of entries) {
        const [route, anchor] = entry.url!.split('#');
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
      /^\/library\/standard\/(grid|axes|frame|surface|legend)(#|\/|$)/.test(entry.url ?? ''),
    );

    for (const [name, entry] of entries) {
      const [route, anchor] = entry.url!.split('#');
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
