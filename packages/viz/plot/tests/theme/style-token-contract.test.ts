import { describe, expect, it } from 'vitest';

import * as plot from '../../src';
import {
  PlotAxisRuleSchema,
  PlotDefaultsSchema,
  PlotSchema,
  PlotShapePaletteSchema,
  PlotThemeResolutionSchema,
} from '../../src';

const baseSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  guides: [],
} as const;

describe('Plot Source defaults and rules contract', () => {
  it('从 Plot 根入口公开 Source schemas，并移除旧 token surface', () => {
    const api = plot as Record<string, unknown>;

    expect(api.PlotDefaultsSchema).toBeDefined();
    expect(api.PlotAxisRuleSchema).toBeDefined();
    expect(api.PlotThemeResolutionSchema).toBeDefined();
    expect('PlotThemeToken' in api).toBe(false);
    expect('PlotThemeTokenOverridesSchema' in api).toBe(false);
    expect('PlotThemeTokenResolutionSchema' in api).toBe(false);
    expect('PlotThemeSchema' in api).toBe(false);
  });

  it('让 IRPlot 接受 Source-shaped defaults 与 ordered Axis rules', () => {
    const source = {
      ...baseSpec,
      plotDefaults: {
        plotArea: { fill: '#f8fafc' },
        typography: { font: { family: 'Source Serif 4', size: 14 }, textColor: '#334155' },
        axis: { line: { stroke: '#475569', strokeWidth: 0 }, ticks: { mark: false } },
        legend: { swatchSize: 12, label: { font: { size: 11 } } },
        palette: {
          categorical: ['#2563eb', '#f97316'],
          series: ['#0f766e'],
          sequential: 'viridis',
          diverging: 'rdbu',
          shape: ['circle'],
        },
      },
      plotRules: [
        { select: { dimension: ['x', 'y'] }, axis: { line: false } },
        { select: { dimension: 'x' }, axis: { grid: false } },
      ],
    };

    const parsed = PlotSchema.parse(source);
    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
  });

  it('拒绝旧 theme root、flat token 与 palette sector', () => {
    for (const key of ['plotThemeTokens', 'plotThemeTokenRules', 'plotTheme']) {
      const result = PlotSchema.safeParse({ ...baseSpec, [key]: {} });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys', path: [] })]),
        );
      }
    }

    const sector = PlotSchema.safeParse({ ...baseSpec, plotDefaults: { palette: { sector: ['#ef4444'] } } });
    expect(sector.success).toBe(false);
    if (!sector.success) {
      expect(sector.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['plotDefaults', 'palette'], code: 'unrecognized_keys' }),
        ]),
      );
    }
  });

  it('对 Source defaults 的错误原子、空 palette 与未知字段给出可定位失败', () => {
    const invalid = [
      [{ axis: { line: { strokeWidth: -1 } } }, ['axis', 'line', 'strokeWidth']],
      [{ axis: { title: { padding: -1 } } }, ['axis', 'title', 'padding']],
      [{ palette: { categorical: [] } }, ['palette', 'categorical']],
      [{ palette: { shape: [] } }, ['palette', 'shape']],
      [{ typography: { unknown: true } }, ['typography']],
    ] as const;

    for (const [value, path] of invalid) {
      const result = PlotDefaultsSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some(issue => issue.path.join('.') === path.join('.'))).toBe(true);
    }
  });

  it('保留 Source palette 的顺序与结构化 shape 引用', () => {
    const shape = ['circle', { type: 'polygon', params: { sides: 5 } }] as const;
    expect(PlotShapePaletteSchema.parse(shape)).toEqual(shape);
    expect(PlotShapePaletteSchema.safeParse([{}]).success).toBe(false);
    expect(
      PlotDefaultsSchema.parse({ palette: { categorical: ['#2563eb'], shape: [...shape] } }).palette?.shape,
    ).toEqual(shape);
  });

  it('让 Axis rule 支持单个、多个和自定义 dimension，并拒绝空 rule', () => {
    for (const dimension of ['x', ['x', 'y'], 'radius']) {
      expect(
        PlotAxisRuleSchema.safeParse({ select: { dimension }, axis: { grid: { includeDomain: true } } }).success,
      ).toBe(true);
    }

    for (const rule of [
      { select: { dimension: '' }, axis: { line: false } },
      { select: { dimension: [] }, axis: { line: false } },
      { select: { dimension: ['x', 'x'] }, axis: { line: false } },
      { select: { dimension: 'x' }, axis: {} },
      { select: { dimension: 'x' }, axis: { typography: { textColor: '#111111' } } },
    ]) {
      expect(PlotAxisRuleSchema.safeParse(rule).success).toBe(false);
    }
  });

  it('PlotThemeResolutionSchema 要求 Neutral layer 与实际 rule source path', () => {
    const valid = {
      mode: 'light',
      defaults: {
        palette: {
          categorical: ['#111111'],
          series: ['#111111'],
          sequential: 'viridis',
          diverging: 'rdbu',
          shape: ['circle'],
        },
      },
      layers: [{ kind: 'neutral', path: '$default/light', defaults: {} }],
      rules: [
        {
          kind: 'neutral',
          sourcePath: '$default/light',
          path: '$default/light/plotRules/0',
          rule: { select: { dimension: 'x' }, axis: { line: false } },
        },
      ],
      palette: {
        categorical: ['#111111'],
        series: ['#111111'],
        sequential: 'viridis',
        diverging: 'rdbu',
        shape: ['circle'],
      },
    };
    expect(PlotThemeResolutionSchema.safeParse(valid).success).toBe(true);
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...valid,
        layers: [{ kind: 'source', path: '$spec', defaults: {} }],
      }).success,
    ).toBe(false);
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...valid,
        rules: [{ ...valid.rules[0], sourcePath: '$style/missing/light' }],
      }).success,
    ).toBe(false);
  });
});
