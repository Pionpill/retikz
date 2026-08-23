import type { CoreProviderContribution, IRScene } from '@retikz/core';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createPlotProviderContribution } from '@retikz/plot';
import { PathClipProvider } from '@retikz/standard/clip';
import { describe, expect, it } from 'vitest';

import { createScatterChartProviderContribution, ScatterChartSchema } from '../../src/point/scatter';

const rows = [
  { x: 1, y: 2, size: 3 },
  { x: 2, y: 4, size: 5 },
];

const sceneIdsOf = (primitives: ReadonlyArray<{ id?: string; children?: ReadonlyArray<unknown> }>): Array<string> =>
  primitives.flatMap(primitive => [
    ...(primitive.id === undefined ? [] : [primitive.id]),
    ...sceneIdsOf((primitive.children ?? []) as Array<{ id?: string; children?: ReadonlyArray<unknown> }>),
  ]);

const compileDefinitionsOf = (chartContributions: ReadonlyArray<CoreProviderContribution>) => {
  const plot = createPlotProviderContribution({ 'scatter.rows': rows });
  return resolveCoreProviderDependencies({
    contributions: [...chartContributions, plot, { roots: [PathClipProvider.key], providers: [PathClipProvider] }],
  });
};

const sceneOf = (source: IRScene['children'][number]): IRScene => ({
  version: 1,
  type: 'scene',
  children: [source],
});

describe('Chart providers through Core compile', () => {
  it('compiles Scatter in one Scene with its provider contribution installed', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        ScatterChartSchema.parse({
          namespace: 'chart',
          type: 'point',
          id: 'scatter',
          data: { reference: 'scatter.rows' },
          recipe: {
            chartType: 'scatter',
            encodings: { x: 'x', y: 'y' },
            properties: { color: '#ef4444' },
          },
          plotExtension: {
            marks: [
              {
                type: 'path',
                order: 'x',
                encoding: { x: { field: 'x' }, y: { field: 'size' } },
                stroke: { kind: 'constant', value: '#2563eb' },
              },
            ],
          },
        }),
      ],
    };

    const result = compileToScene(scene, compileDefinitionsOf([createScatterChartProviderContribution()]));

    expect(result.scene.primitives).toHaveLength(1);
    expect(sceneIdsOf(result.scene.primitives)).toContain('scatter');
    expect(JSON.stringify(result.scene.primitives)).toContain('#2563eb');
  });

  it('parses unknown JSON with the selected Scatter schema before compiling through its provider', () => {
    const unknownJson: unknown = {
      namespace: 'chart',
      type: 'point',
      id: 'scatter-json',
      data: { reference: 'scatter.rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    };
    const source = ScatterChartSchema.parse(unknownJson);
    const result = compileToScene(sceneOf(source), compileDefinitionsOf([createScatterChartProviderContribution()]));

    expect(source.recipe.chartType).toBe('scatter');
    expect(sceneIdsOf(result.scene.primitives)).toContain('scatter-json');
  });

  it('reports a diagnostic error when the parsed schema and installed chartType provider disagree', () => {
    const source = ScatterChartSchema.parse({
      namespace: 'chart',
      type: 'point',
      id: 'scatter-mismatch',
      data: { reference: 'scatter.rows' },
      recipe: { chartType: 'scatter', encodings: { x: 'x', y: 'y' } },
    });

    const warnings: Array<{ code: string; message: string }> = [];
    const result = compileToScene(sceneOf(source), {
      ...compileDefinitionsOf([]),
      onWarn: warning => warnings.push({ code: warning.code, message: warning.message }),
    });

    expect(result.scene.primitives).toHaveLength(0);
    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'COMPOSITE_NOT_REGISTERED',
        message: expect.stringMatching(/chart\.point|scatter|provider/i),
      }),
    ]);
  });
});
