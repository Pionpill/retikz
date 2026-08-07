import type { IRScene, ScenePrimitive } from '@retikz/core';

import { compileToScene, resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { lowerPlots, PathMarkSchema, PlotThemeToken, PlotThemeTokenDefinition, PointMarkSchema } from '@retikz/plot';
import { FlexLayoutDefinition } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { ConnectedScatterChartDefinition, resolveChartSpec } from '../../src/resolution';
import { ChartThemeTokenDefinition } from '../../src/style';

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
];

const chartSpec = {
  namespace: 'chart',
  type: 'connected-scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'x' },
} as const;

const scene: IRScene = {
  version: 1,
  type: 'scene',
  theme: {
    tokens: {
      chart: { 'chart.axis.enabled': false },
      plot: { [PlotThemeToken.PlotPaletteSeries]: ['#bundle-series'] },
    },
  },
  children: [chartSpec],
};

const composites = [ConnectedScatterChartDefinition, FlexLayoutDefinition, ...lowerPlots({ rows })];

const hasPrimitiveId = (primitives: ReadonlyArray<ScenePrimitive>, id: string): boolean =>
  primitives.some(
    primitive => primitive.id === id || (primitive.type === 'group' && hasPrimitiveId(primitive.children, id)),
  );

const findGroupById = (
  primitives: ReadonlyArray<ScenePrimitive>,
  id: string,
): Extract<ScenePrimitive, { type: 'group' }> | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'group' && primitive.id === id) return primitive;
    if (primitive.type === 'group') {
      const nested = findGroupById(primitive.children, id);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
};

const findPathPrimitive = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'path' }> | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'path') return primitive;
    if (primitive.type === 'group') {
      const nested = findPathPrimitive(primitive.children);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
};

const findEllipsePrimitive = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'ellipse' }> | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'ellipse') return primitive;
    if (primitive.type === 'group') {
      const nested = findEllipsePrimitive(primitive.children);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
};

const constantStringOf = (value: unknown): string => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'constant' &&
    'value' in value &&
    typeof value.value === 'string'
  ) {
    return value.value;
  }
  throw new Error('Expected a constant string mark value');
};

const scopedSiblingScene: IRScene = {
  version: 1,
  type: 'scene',
  theme: { tokens: { chart: { 'chart.axis.enabled': false } } },
  children: [
    {
      type: 'scope',
      id: 'inner-scope',
      theme: { tokens: { chart: { 'chart.axis.enabled': true } } },
      children: [{ ...chartSpec, id: 'inner-chart' }],
    },
    { ...chartSpec, id: 'sibling-chart' },
  ],
};

describe('Chart owner-local theme bundle', () => {
  it('requires both Chart and Plot definitions for a themed direct bundle', () => {
    expect(() =>
      compileToScene(scene, {
        composites,
        themeTokenDefinitions: [PlotThemeTokenDefinition],
      }),
    ).toThrow(/unknown Theme token namespace "chart"/i);
    expect(() =>
      compileToScene(scene, {
        composites,
        themeTokenDefinitions: [ChartThemeTokenDefinition],
      }),
    ).toThrow(/unknown Theme token namespace "plot"/i);
  });

  it('keeps Chart recipe pre-read and final Plot lowering on one Plot palette', () => {
    const effectiveTheme = {
      style: ThemeStyle.Neutral,
      mode: ThemeMode.Light,
      tokens: scene.theme?.tokens,
      colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
    } as const;
    const resolution = resolveChartSpec(chartSpec, effectiveTheme);
    const connectionMark = PathMarkSchema.parse(
      resolution.plotSpec.marks.find(mark => mark.id === '__chart.connected-scatter.mark.connection'),
    );
    const pointMark = PointMarkSchema.parse(
      resolution.plotSpec.marks.find(mark => mark.id === '__chart.connected-scatter.mark.points'),
    );
    const expectedConnectionStroke = constantStringOf(connectionMark.stroke);
    const expectedPointColor = constantStringOf(pointMark.color);
    expect(expectedConnectionStroke).toBe('#bundle-series');
    expect(expectedPointColor).toBe('#bundle-series');

    const compiled = compileToScene(scene, {
      composites,
      themeTokenDefinitions: [ChartThemeTokenDefinition, PlotThemeTokenDefinition],
    }).scene;
    const connectionGroup = findGroupById(compiled.primitives, 'sales/plot.__chart.connected-scatter.mark.connection');
    const pointsGroup = findGroupById(compiled.primitives, 'sales/plot.__chart.connected-scatter.mark.points');
    expect(connectionGroup).toBeDefined();
    expect(pointsGroup).toBeDefined();
    if (connectionGroup === undefined || pointsGroup === undefined) {
      throw new Error('Expected connected-scatter mark groups in the compiled Scene');
    }
    const connectionPath = findPathPrimitive(connectionGroup.children);
    const pointEllipse = findEllipsePrimitive(pointsGroup.children);
    expect(connectionPath).toBeDefined();
    expect(pointEllipse).toBeDefined();
    if (connectionPath === undefined || pointEllipse === undefined) {
      throw new Error('Expected connected-scatter path and point primitives in the compiled Scene');
    }
    expect(connectionPath.stroke).toBe(expectedConnectionStroke);
    expect(pointEllipse.fill).toBe(expectedPointColor);
    expect(pointEllipse.stroke).toBe(expectedPointColor);
  });

  it('applies inherited Chart tokens only to the current Core scope descendants', () => {
    const options = {
      composites,
      themeTokenDefinitions: [ChartThemeTokenDefinition, PlotThemeTokenDefinition],
    } as const;
    const compiled = compileToScene(scopedSiblingScene, options).scene;
    const innerChart = findGroupById(compiled.primitives, 'inner-chart');
    const siblingChart = findGroupById(compiled.primitives, 'sibling-chart');
    expect(innerChart).toBeDefined();
    expect(siblingChart).toBeDefined();
    if (innerChart === undefined || siblingChart === undefined) {
      throw new Error('Expected both inner and sibling Chart groups in the compiled Scene');
    }

    expect(hasPrimitiveId(innerChart.children, '__chart.connected-scatter.guide.x')).toBe(true);
    expect(hasPrimitiveId(siblingChart.children, '__chart.connected-scatter.guide.x')).toBe(false);
  });
});
