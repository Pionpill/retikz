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
import { TransformSchema } from '@retikz/data';
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
  VisualEncodingSchema,
  GuideSchema,
  MarkSchema,
  PlotDefaultsSchema,
  PlotLayerSchema,
  PlotSchema,
  PlotThemeResolutionSchema,
  ScaleSchema,
} from '@retikz/plot';
import { LegendArtifactSchema, LegendSchema, SurfaceSchema } from '@retikz/standard/presentation';
import { TableSchema } from '@retikz/table';
import GithubSlugger from 'github-slugger';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { lookupSchema, SCHEMA_REGISTRY } from '@/modules/docs/components';
import { expandMdxIncludes } from '@/modules/docs/lib';

describe('SCHEMA_REGISTRY', () => {
  it('contains the documented Kernel, Data, Table, and Plot schema surfaces', () => {
    const expected = {
      SceneSchema: { schema: SceneSchema },
      ContextualColorSchema: {
        schema: ContextualColorSchema,
      },
      LayoutInspectSpacingOptionsSchema: { schema: LayoutInspectSpacingOptionsSchema },
      TableSchema: { schema: TableSchema },
      PlotSchema: { schema: PlotSchema },
      VisualEncodingSchema: { schema: VisualEncodingSchema },
      DataTransformSchema: { schema: TransformSchema },
      MarkSchema: { schema: MarkSchema },
      ScaleSchema: { schema: ScaleSchema },
      PlotCoordinateSchema: { schema: PlotCoordinateSchema },
      GuideSchema: { schema: GuideSchema },
      PlotLayerSchema: { schema: PlotLayerSchema },
      PlotDefaultsSchema: { schema: PlotDefaultsSchema },
      PlotThemeResolutionSchema: { schema: PlotThemeResolutionSchema },
      LegendSchema: {
        schema: LegendSchema,
        url: '/library/standard/presentation/legend#legendschema',
      },
      LegendArtifactSchema: {
        schema: LegendArtifactSchema,
        url: '/library/standard/presentation/legend#legendartifact',
      },
      SurfaceSchema: {
        schema: SurfaceSchema,
        url: '/library/standard/presentation/surface#surfaceschema',
      },
      BlockSchema: { schema: BlockSchema, url: '/schematic/graph/block/reference' },
      BlockHeaderSchema: { schema: BlockHeaderSchema, url: '/schematic/graph/block/reference' },
      BlockSectionSchema: { schema: BlockSectionSchema, url: '/schematic/graph/block/reference' },
      BlockRowSchema: { schema: BlockRowSchema, url: '/schematic/graph/block/reference' },
      EntitySchema: { schema: EntitySchema, url: '/schematic/graph/entity/reference' },
      RelationSchema: { schema: RelationSchema },
    };
    for (const [name, entry] of Object.entries(expected)) {
      expect(SCHEMA_REGISTRY[name].schema, name).toBe(entry.schema);
      if ('url' in entry) expect(SCHEMA_REGISTRY[name].url, name).toBe(entry.url);
    }
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
    expect(lookupSchema(CoordinateSchema)?.url).toBe(
      '/kernel/components/node/reference#ircoordinate--coordinateschema',
    );
    expect(lookupSchema(MoveStepSchema)?.url).toBe('/kernel/components/path/reference#movestepschema');
    expect(lookupSchema(AxisLineStepSchema)?.url).toBe('/kernel/components/path/reference#axislinestepschema');
    expect(lookupSchema(RelativeTargetSchema)?.url).toBeUndefined();
    expect(lookupSchema(LayoutInspectSpacingOptionsSchema)?.url).toBe(
      '/library/layout/flex-layout/reference#layoutinspectspacingoptionsschema',
    );
    expect(lookupSchema(TableSchema)?.url).toBe('/viz/table/reference/contract-table#tableschema');
    expect(lookupSchema(LegendSchema)?.url).toBe('/library/standard/presentation/legend#legendschema');
    expect(lookupSchema(LegendArtifactSchema)?.url).toBe('/library/standard/presentation/legend#legendartifact');
    expect(lookupSchema(SurfaceSchema)?.url).toBe('/library/standard/presentation/surface#surfaceschema');
  });

  it('links Layout Inspector options to the bilingual merged reference', async () => {
    const referenceRoot = resolve(process.cwd(), 'src/modules/docs/contents/library/layout/flex-layout/reference');

    for (const lang of ['zh', 'en'] as const) {
      const source = await expandMdxIncludes(readFileSync(resolve(referenceRoot, `index.${lang}.mdx`), 'utf8'), lang);

      expect(source).toContain('>LayoutInspectSpacingOptionsSchema</ApiSourceLink>');
      expect(source).toContain('name="LayoutInspectSpacingOptionsSchema"');
    }
  });

  it.each(['data', 'table', 'plot'] as const)(
    'keeps every Viz %s contract registry URL on a documented English heading',
    async moduleId => {
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
        const slugger = new GithubSlugger();
        const expanded = await expandMdxIncludes(source, 'en');
        const headingAnchors = Array.from(expanded.matchAll(/^#{2,6}\s+(.+)$/gm), match =>
          slugger.slug(match[1].replaceAll(/<[^>]+>/g, '').replaceAll('`', '')),
        );

        expect(headingAnchors, `${name} -> ${entry.url}`).toContain(anchor);
      }
    },
  );

  it('keeps every Standard composite registry URL on a documented English heading', async () => {
    const entries = Object.entries(SCHEMA_REGISTRY).filter(([, entry]) =>
      /^\/library\/standard\/presentation\/(grid|axes|frame|surface|legend)(#|\/|$)/.test(entry.url ?? ''),
    );

    for (const [name, entry] of entries) {
      const [route, anchor] = entry.url!.split('#');

      expect(anchor, name).toBeTruthy();

      const source = readFileSync(
        resolve(process.cwd(), 'src/modules/docs/contents', route.slice(1), 'index.en.mdx'),
        'utf8',
      );
      const slugger = new GithubSlugger();
      const expanded = await expandMdxIncludes(source, 'en');
      const headingAnchors = Array.from(expanded.matchAll(/^#{2,6}\s+(.+)$/gm), match =>
        slugger.slug(match[1].replaceAll(/<[^>]+>/g, '').replaceAll('`', '')),
      );

      expect(headingAnchors, `${name} -> ${entry.url}`).toContain(anchor);
    }
  });

  it('returns undefined for unregistered schemas', () => {
    expect(lookupSchema(z.string())).toBeUndefined();
  });

  it('所有有锚点的 Schema 注册链接指向展开后的中英文真实标题', async () => {
    const failures: Array<string> = [];
    for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
      if (!entry.url?.includes('#')) continue;
      const [route, anchor] = entry.url.split('#');
      for (const language of ['zh', 'en'] as const) {
        const raw = readFileSync(
          resolve(process.cwd(), 'src/modules/docs/contents', route.slice(1), `index.${language}.mdx`),
          'utf8',
        );
        const source = (await expandMdxIncludes(raw, language)).replaceAll(/```[\s\S]*?```/g, '');
        const slugger = new GithubSlugger();
        const headings = [...source.matchAll(/^#{2,6}\s+(.+)$/gm)].map(match =>
          slugger.slug(match[1].replaceAll(/<[^>]+>/g, '').replaceAll('`', '')),
        );
        if (!headings.includes(decodeURIComponent(anchor))) failures.push(`${name}.${language}: ${entry.url}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
