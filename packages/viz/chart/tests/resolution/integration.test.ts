import type { CompileWarning, IRScene, ScenePrimitive } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions } from '@retikz/plot';

import { compileToScene } from '@retikz/core';
import { createPlotLocator, defineMark, lowerPlots, lowerPlotWithLineage, PlotSpecSchema } from '@retikz/plot';
import { FlexLayoutDefinition } from '@retikz/standard';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { InfrastructureChartSpecSchema } from '../../src/internal/fixture';
import { InfrastructureChartDefinition, resolveChartSpec } from '../../src/resolution';

const rows = [
  { key: 'r2', x: 2, y: 20, series: 'north' },
  { key: 'r1', x: 1, y: 10, series: 'south' },
  { key: 'r3', x: 3, y: 30, series: 'north' },
];

const datasets: ExternalDatasets = { sales: rows };

const chartSpec = InfrastructureChartSpecSchema.parse({
  namespace: 'chart',
  type: '__infrastructure-fixture',
  id: 'sales',
  data: { reference: 'sales' },
  encoding: { x: 'x', y: 'y' },
  marks: [
    {
      type: 'path',
      id: 'trend',
      series: 'series',
      order: 'x',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
  ],
});

const barePlotSpec: IRPlotSpec = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  id: 'sales/plot',
  data: { reference: 'sales' },
  transform: [{ kind: 'sort', field: 'x', order: 'ascending' }],
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    {
      type: 'point',
      id: '__chart.__infrastructure-fixture.mark.main',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
    {
      type: 'path',
      id: 'trend',
      series: 'series',
      order: 'x',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    },
  ],
  guides: [
    { type: 'axis', id: '__chart.__infrastructure-fixture.guide.x', dimension: 'x' },
    { type: 'axis', id: '__chart.__infrastructure-fixture.guide.y', dimension: 'y', grid: true },
  ],
});

const presentedChartSpec = InfrastructureChartSpecSchema.parse({
  ...chartSpec,
  presentation: {
    layout: { rowGap: 8, alignItems: 'start' },
    children: [
      { content: { kind: 'preset', preset: 'title', text: 'Revenue' } },
      { content: { kind: 'plot' } },
      {
        key: 'badge',
        content: { kind: 'child', child: { type: 'node', position: [0, 0], text: 'Draft' } },
      },
      {
        content: {
          kind: 'preset',
          preset: 'caption',
          text: { text: 'Quarterly revenue', font: { style: 'italic' } },
        },
      },
    ],
  },
});

const sceneOf = (child: IRScene['children'][number]): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

/** 递归收集 Scene 中带 Plot provenance 的 primitive trace */
const collectPlotTrace = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Array<{ type: ScenePrimitive['type']; id?: string; meta: NonNullable<ScenePrimitive['meta']> }> => {
  const trace: Array<{
    type: ScenePrimitive['type'];
    id?: string;
    meta: NonNullable<ScenePrimitive['meta']>;
  }> = [];
  const visit = (primitive: ScenePrimitive): void => {
    if (primitive.meta?.source === 'plot') {
      trace.push({
        type: primitive.type,
        ...(primitive.id === undefined ? {} : { id: primitive.id }),
        meta: primitive.meta,
      });
    }
    if (primitive.type === 'group') primitive.children.forEach(visit);
  };
  primitives.forEach(visit);
  return trace;
};

/** 判断 Scene primitive tree 是否包含指定稳定 id */
const hasPrimitiveId = (primitives: ReadonlyArray<ScenePrimitive>, id: string): boolean =>
  primitives.some(
    primitive => primitive.id === id || (primitive.type === 'group' && hasPrimitiveId(primitive.children, id)),
  );

const compileOptions: LowerPlotsOptions = {
  width: 320,
  height: 180,
  provenance: true,
  datumProvenance: true,
  datumIdField: 'key',
};

describe('Chart composite recursive integration', () => {
  it('reports the nested Plot composite when the Plot definition is absent', () => {
    const warnings: Array<CompileWarning> = [];

    compileToScene(sceneOf(chartSpec), {
      composites: [InfrastructureChartDefinition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'COMPOSITE_NOT_REGISTERED',
        message: "No composite registered for 'plot.plot'; the node is skipped.",
      }),
    ]);
  });

  it('expands to the resolved Plot node and lets Core consume lowerPlots recursively', () => {
    const resolution = resolveChartSpec(chartSpec);
    const warnings: Array<CompileWarning> = [];

    expect(InfrastructureChartDefinition.expand(chartSpec)).toEqual(resolution.node);
    expect(resolution.node).toMatchObject({
      type: 'scope',
      id: 'sales',
      children: [{ namespace: 'plot', type: 'plot', id: 'sales/plot' }],
    });

    const result = compileToScene(sceneOf(chartSpec), {
      composites: [InfrastructureChartDefinition, ...lowerPlots(datasets, compileOptions)],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(collectPlotTrace(result.scene.primitives).length).toBeGreaterThan(0);
  });

  it('保留缺失 Standard FlexLayout definition 的 Core 原生诊断', () => {
    const warnings: Array<CompileWarning> = [];

    compileToScene(sceneOf(presentedChartSpec), {
      composites: [InfrastructureChartDefinition, ...lowerPlots(datasets, compileOptions)],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'COMPOSITE_NOT_REGISTERED',
        message: "No composite registered for 'standard.flexLayout'; the node is skipped.",
      }),
    ]);
  });

  it('通过显式 Chart、FlexLayout 与 Plot definitions 递归 compile presentation content', () => {
    const warnings: Array<CompileWarning> = [];
    const resolution = resolveChartSpec(presentedChartSpec);

    expect(InfrastructureChartDefinition.expand(presentedChartSpec)).toEqual(resolution.node);
    expect(resolution.node).toMatchObject({
      type: 'scope',
      id: 'sales',
      children: [
        {
          namespace: 'standard',
          type: 'flexLayout',
          children: [
            { key: 'chart.presentation.title' },
            { key: 'chart.plot' },
            { key: 'badge', child: { type: 'node', text: 'Draft' } },
            { key: 'chart.presentation.caption' },
          ],
        },
      ],
    });

    const result = compileToScene(sceneOf(presentedChartSpec), {
      composites: [InfrastructureChartDefinition, FlexLayoutDefinition, ...lowerPlots(datasets, compileOptions)],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(collectPlotTrace(result.scene.primitives).length).toBeGreaterThan(0);
  });
});

const DiagnosticMarkSchema = z.strictObject({
  type: z.literal('diagnostic'),
  text: z.string(),
});

const diagnosticMark = (suffix: string) =>
  defineMark({
    schema: DiagnosticMarkSchema,
    lower: mark => ({ type: 'node', id: `custom-${suffix}`, position: [0, 0], text: mark.text }),
  });

const chartWithCustomMark = InfrastructureChartSpecSchema.parse({
  namespace: 'chart',
  type: '__infrastructure-fixture',
  data: { reference: 'sales' },
  encoding: { x: 'x', y: 'y' },
  marks: [{ type: 'diagnostic', text: 'custom mark reached Plot' }],
});

describe('Plot definition pass-through', () => {
  it('uses a custom mark definition supplied only through lowerPlots', () => {
    const scene = compileToScene(sceneOf(chartWithCustomMark), {
      composites: [
        InfrastructureChartDefinition,
        ...lowerPlots(datasets, { ...compileOptions, markDefinitions: [diagnosticMark('one')] }),
      ],
      onWarn: () => undefined,
    }).scene;

    expect(hasPrimitiveId(scene.primitives, 'custom-one')).toBe(true);
  });

  it('keeps the existing Plot diagnostic for a missing custom mark definition', () => {
    expect(() =>
      compileToScene(sceneOf(chartWithCustomMark), {
        composites: [InfrastructureChartDefinition, ...lowerPlots(datasets, compileOptions)],
        onWarn: () => undefined,
      }),
    ).toThrow(/mark type "diagnostic" is not registered/);
  });

  it('keeps the existing Plot diagnostic for conflicting custom mark definitions', () => {
    expect(() =>
      compileToScene(sceneOf(chartWithCustomMark), {
        composites: [
          InfrastructureChartDefinition,
          ...lowerPlots(datasets, {
            ...compileOptions,
            markDefinitions: [diagnosticMark('one'), diagnosticMark('two')],
          }),
        ],
        onWarn: () => undefined,
      }),
    ).toThrow(/duplicate mark registration: "diagnostic"/);
  });
});

describe('Plot trace continuity', () => {
  it('preserves Scene trace, locator source identity, and lineage across the Chart wrapper', () => {
    const resolution = resolveChartSpec(presentedChartSpec);
    const { theme: resolvedTheme, ...resolvedCore } = resolution.plotSpec;
    expect(resolvedTheme).toBeDefined();
    expect(resolvedCore).toEqual(barePlotSpec);

    const bareScene = compileToScene(sceneOf(resolution.plotSpec), {
      composites: lowerPlots(datasets, compileOptions),
      onWarn: () => undefined,
    }).scene;
    const wrappedScene = compileToScene(sceneOf(presentedChartSpec), {
      composites: [InfrastructureChartDefinition, FlexLayoutDefinition, ...lowerPlots(datasets, compileOptions)],
      onWarn: () => undefined,
    }).scene;
    const bareTrace = collectPlotTrace(bareScene.primitives);
    const wrappedTrace = collectPlotTrace(wrappedScene.primitives);

    expect(wrappedTrace).toEqual(bareTrace);
    expect(
      wrappedTrace
        .map(primitive => primitive.meta.sourceIndex)
        .filter((value): value is number => typeof value === 'number'),
    ).toEqual([1, 0, 2]);
    expect(wrappedTrace.some(primitive => primitive.meta.series === 'north')).toBe(true);
    expect(wrappedTrace.some(primitive => primitive.id === 'sales/plot.datum.r1')).toBe(true);

    const resolvedLocator = createPlotLocator(resolution.plotSpec, datasets, compileOptions);
    const bareLocator = createPlotLocator(barePlotSpec, datasets, compileOptions);
    expect(resolvedLocator.datum(0)).toEqual(bareLocator.datum(0));
    expect(resolvedLocator.datum(0)?.meta).toMatchObject({
      source: 'plot',
      dataReference: 'sales',
      transformedIndex: 0,
      sourceIndex: 1,
    });

    const lineageOptions = {
      ...compileOptions,
      lineage: {
        data: { sourceIdentity: true, transformSteps: true },
        scaleMappings: true,
      },
    } as const;
    const resolvedLineage = lowerPlotWithLineage(resolution.plotSpec, datasets, lineageOptions).lineage;
    const bareLineage = lowerPlotWithLineage(barePlotSpec, datasets, lineageOptions).lineage;
    expect(JSON.stringify(resolvedLineage)).toBe(JSON.stringify(bareLineage));
    expect(resolvedLineage).toMatchObject({
      plotId: 'sales/plot',
      dataReference: 'sales',
      marks: [
        { markIndex: 0, markType: 'point', markId: '__chart.__infrastructure-fixture.mark.main' },
        { markIndex: 1, markType: 'path', markId: 'trend' },
      ],
    });
  });
});
