import type { CompileWarning, IRScene, ScenePrimitive } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import { compileToScene } from '@retikz/core';
import { DataFieldType } from '@retikz/data';
import { createPlotLocator, lowerPlots, lowerPlotWithLineage } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { BubbleChartDefinition, resolveChartSpec } from '../../../src/resolution';

const base = {
  namespace: 'chart',
  type: 'bubble',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { field: 'weight' } },
} as const;

const sceneOf = (child: IRScene['children'][number]): IRScene => ({ version: 1, type: 'scene', children: [child] });

const collectDatumIndices = (primitives: ReadonlyArray<ScenePrimitive>): Array<number> =>
  primitives.flatMap(primitive => [
    ...(typeof primitive.meta?.transformedIndex === 'number' ? [primitive.meta.transformedIndex] : []),
    ...(primitive.type === 'group' ? collectDatumIndices(primitive.children) : []),
  ]);

describe('Bubble Chart resolution', () => {
  it('resolves a distinct Bubble PlotSpec and inspection identity', () => {
    const result = resolveChartSpec(base);

    expect(result.plotSpec).toMatchObject({
      id: 'sales/plot',
      scales: [{ name: '__chart.bubble.scale.x' }, { name: '__chart.bubble.scale.y' }],
      marks: [
        {
          type: 'point',
          id: '__chart.bubble.mark.main',
          size: { kind: 'field', value: 'weight' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    expect(result.plotSpec.guides).toContainEqual({ type: 'legend', channel: 'size' });
    expect(result.inspection.chart.type).toBe('bubble');
    expect(result.inspection.members.find(member => member.target === 'mark.main')?.sources).toEqual([
      { kind: 'type-default', path: '$recipe/bubble/mark.main' },
    ]);
  });

  it('keeps explicit guides presentational and preserves authored spatial roots', () => {
    const authoredGuides = resolveChartSpec({
      ...base,
      guides: [{ type: 'axis', id: 'authored-axis', dimension: 'x' }],
    }).plotSpec;
    expect(authoredGuides.guides).toEqual([{ type: 'axis', id: 'authored-axis', dimension: 'x' }]);
    expect(authoredGuides.marks[0]).toMatchObject({ size: { kind: 'field', value: 'weight' } });

    const polar = resolveChartSpec({
      ...base,
      coordinate: {
        type: 'polar2D',
        angle: '__chart.bubble.scale.x',
        radius: '__chart.bubble.scale.y',
      },
    }).plotSpec;
    expect(polar.coordinate).toMatchObject({ type: 'polar2D' });

    const composition = resolveChartSpec({
      ...base,
      composition: {
        defaultView: 'main',
        views: [
          {
            id: 'main',
            coordinate: {
              type: 'cartesian2D',
              x: '__chart.bubble.scale.x',
              y: '__chart.bubble.scale.y',
            },
          },
        ],
      },
    }).plotSpec;
    expect(composition.coordinate).toBeUndefined();
    expect(composition.marks[0].coordinateView).toBe('main');
  });

  it('exposes the owner-private composite and skips invalid-size glyph rows through Plot', () => {
    const datasets: ExternalDatasets = {
      rows: [
        { x: 0, y: 0, weight: undefined },
        { x: 1, y: 1, weight: null },
        { x: 2, y: 2, weight: Number.NaN },
        { x: 3, y: 3, weight: Number.POSITIVE_INFINITY },
        { x: 4, y: 4, weight: 9 },
      ],
    };
    const warnings: Array<CompileWarning> = [];

    expect(BubbleChartDefinition.expand(base)).toEqual(resolveChartSpec(base).node);
    const result = compileToScene(sceneOf(base), {
      composites: [
        BubbleChartDefinition,
        ...lowerPlots(datasets, { width: 320, height: 180, provenance: true, datumProvenance: true }),
      ],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([]);
    expect(collectDatumIndices(result.scene.primitives)).toEqual([4]);
  });

  it.each([
    { label: 'empty', rows: [], expectedIndices: [] },
    {
      label: 'all-missing',
      rows: [
        { x: 0, y: 0, weight: undefined },
        { x: 1, y: 1, weight: null },
      ],
      expectedIndices: [],
    },
    {
      label: 'all-zero',
      rows: [
        { x: 0, y: 0, weight: 0 },
        { x: 1, y: 1, weight: 0 },
      ],
      expectedIndices: [0, 1],
    },
    { label: 'single-positive', rows: [{ x: 0, y: 0, weight: 9 }], expectedIndices: [0] },
  ])('preserves the Bubble descriptor and legend through $label data', ({ rows, expectedIndices }) => {
    const warnings: Array<CompileWarning> = [];
    const resolution = resolveChartSpec(base);
    const result = compileToScene(sceneOf(base), {
      composites: [
        BubbleChartDefinition,
        ...lowerPlots({ rows }, { width: 320, height: 180, provenance: true, datumProvenance: true }),
      ],
      onWarn: warning => warnings.push(warning),
    });

    expect(resolution.plotSpec.guides).toContainEqual({ type: 'legend', channel: 'size' });
    expect(warnings).toEqual([]);
    expect(collectDatumIndices(result.scene.primitives)).toEqual(expectedIndices);
  });

  it('keeps negative Bubble size values fail-loud through the Plot channel', () => {
    expect(() =>
      compileToScene(sceneOf(base), {
        composites: [
          BubbleChartDefinition,
          ...lowerPlots({ rows: [{ x: 0, y: 0, weight: -1 }] }, { width: 320, height: 180 }),
        ],
      }),
    ).toThrow(/negative/i);
  });

  it('keeps Plot quantitative field validation authoritative through the Bubble wrapper', () => {
    const chart = {
      ...base,
      data: {
        reference: 'rows',
        model: [
          { name: 'x', type: DataFieldType.Continuous },
          { name: 'y', type: DataFieldType.Continuous },
          { name: 'weight', type: DataFieldType.Categorical },
        ],
      },
    } as const;
    const datasets: ExternalDatasets = { rows: [{ x: 1, y: 2, weight: 9 }] };

    expect(() =>
      compileToScene(sceneOf(chart), {
        composites: [BubbleChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
      }),
    ).toThrow(/size requires a continuous field/);
  });

  it('validates explicit size scale identity and sqrt type before degenerate delivery', () => {
    const unknownScale = {
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight', scale: 'missing-radius' } },
    } as const;
    expect(() =>
      compileToScene(sceneOf(unknownScale), {
        composites: [BubbleChartDefinition, ...lowerPlots({ rows: [] }, { width: 320, height: 180 })],
      }),
    ).toThrow(/scale.*not registered|unknown.*scale/i);

    const linearScale = {
      ...base,
      encoding: { ...base.encoding, size: { field: 'weight', scale: 'weight-radius' } },
      scales: [{ type: 'linear', name: 'weight-radius' }],
    } as const;
    expect(() =>
      compileToScene(sceneOf(linearScale), {
        composites: [
          BubbleChartDefinition,
          ...lowerPlots(
            {
              rows: [
                { x: 1, y: 2, weight: 0 },
                { x: 2, y: 3, weight: 0 },
              ],
            },
            { width: 320, height: 180 },
          ),
        ],
      }),
    ).toThrow(/sqrt/i);
  });

  it('fails loudly when an implicit size legend sees multiple descriptor identities', () => {
    const chart = {
      ...base,
      marks: [
        {
          type: 'point',
          id: 'extra-points',
          size: { kind: 'field', value: 'otherWeight' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    } as const;
    const datasets: ExternalDatasets = { rows: [{ x: 1, y: 2, weight: 9, otherWeight: 16 }] };

    expect(() =>
      compileToScene(sceneOf(chart), {
        composites: [BubbleChartDefinition, ...lowerPlots(datasets, { width: 320, height: 180 })],
      }),
    ).toThrow(/multiple scales/i);
  });

  it('keeps guide inspection, datum locator and lineage visible through the Bubble wrapper', () => {
    const datasets: ExternalDatasets = {
      rows: [
        { id: 'a', x: 1, y: 2, weight: 4 },
        { id: 'b', x: 2, y: 3, weight: 9 },
      ],
    };
    const resolution = resolveChartSpec(base);
    expect(resolution.inspection.members.find(member => member.target === 'guide.size')).toMatchObject({
      kind: 'guide',
      core: false,
      sources: [{ kind: 'type-default', path: '$recipe/bubble/guide.size' }],
    });

    const options = { width: 320, height: 180, provenance: true, datumProvenance: true, datumIdField: 'id' } as const;
    expect(createPlotLocator(resolution.plotSpec, datasets, options).datum(1)?.meta).toMatchObject({
      source: 'plot',
      dataReference: 'rows',
      transformedIndex: 1,
      sourceIndex: 1,
    });
    expect(
      lowerPlotWithLineage(resolution.plotSpec, datasets, {
        ...options,
        lineage: { data: { sourceIdentity: true, transformSteps: true }, scaleMappings: true },
      }).lineage,
    ).toMatchObject({
      plotId: 'sales/plot',
      dataReference: 'rows',
      marks: [{ markIndex: 0, markType: 'point', markId: '__chart.bubble.mark.main' }],
    });
  });
});
