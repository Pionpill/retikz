import { resolveDefaultCoreThemeColors, ThemeMode, ThemeTokenSource } from '@retikz/core';
import { resolvePlotTheme } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { ChartInspectionSchema } from '../../src/inspection';
import { ChartSharedSchema } from '../../src/schemas/common';
import { ChartThemeToken, getDefaultChartThemePreset } from '../../src/style';

describe('Chart shared schemas', () => {
  it('复用 Data 与 Plot 字段契约', () => {
    expect(
      ChartSharedSchema.parse({
        id: 'sales',
        data: { reference: 'rows' },
        transform: [{ kind: 'sort', field: 'amount', order: 'descending' }],
        scales: [{ type: 'linear', name: 'x' }],
        coordinate: { type: 'cartesian2D', x: 'x' },
        guides: [{ type: 'axis', dimension: 'x' }],
        marks: [{ type: 'point', encoding: { x: { field: 'amount', scale: 'x' } } }],
        plotTheme: { plotArea: { fill: '#ffffff' } },
        width: 480,
        height: 300,
        meta: { source: 'test' },
      }),
    ).toEqual({
      id: 'sales',
      data: { reference: 'rows' },
      transform: [{ kind: 'sort', field: 'amount', order: 'descending' }],
      scales: [{ type: 'linear', name: 'x' }],
      coordinate: { type: 'cartesian2D', x: 'x' },
      guides: [{ type: 'axis', dimension: 'x' }],
      marks: [{ type: 'point', encoding: { x: { field: 'amount', scale: 'x' } } }],
      plotTheme: { plotArea: { fill: '#ffffff' } },
      width: 480,
      height: 300,
      meta: { source: 'test' },
    });

    expect(() => ChartSharedSchema.parse({ data: { source: 'rows' } })).toThrow();
    expect(() =>
      ChartSharedSchema.parse({ data: { reference: 'rows' }, scales: [{ type: 'linear', name: '' }] }),
    ).toThrow();
  });

  it('拒绝已移除的 Plot-level presentation layout', () => {
    expect(
      ChartSharedSchema.safeParse({
        data: { reference: 'rows' },
        layout: { autoPadding: true },
      }).success,
    ).toBe(false);
  });

  it('拒绝把 canonical presentation 混入 typed Chart shared fragment', () => {
    expect(
      ChartSharedSchema.safeParse({
        data: { reference: 'rows' },
        presentation: {
          children: [
            { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Revenue' },
            { kind: 'plot', key: 'chart.plot' },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it('接受 owner composition 字段作为唯一空间根', () => {
    expect(
      ChartSharedSchema.parse({
        data: { reference: 'rows' },
        composition: {
          defaultView: 'main',
          views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
        },
      }),
    ).toEqual({
      data: { reference: 'rows' },
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });
  });

  it('对 shared 与最终 variant 使用同一空间根互斥诊断', () => {
    const result = ChartSharedSchema.safeParse({
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D' },
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      path: ['composition'],
      message: 'Chart spec cannot use coordinate and composition together',
    });
  });

  it('校验 inspection 的公开 JSON 结构', () => {
    const tokens = getDefaultChartThemePreset('light');
    const style = {
      chart: {
        mode: 'light',
        tokens,
        tokenSources: Object.values(ChartThemeToken).map(token => ({
          token,
          kind: ThemeTokenSource.Local,
          path: `$default/light/${token}`,
        })),
      },
      plot: resolvePlotTheme({
        mode: ThemeMode.Light,
        colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
      }),
    } as const;
    expect(
      ChartInspectionSchema.parse({
        chart: { type: 'scatter', id: 'sales' },
        plot: { id: 'sales/plot' },
        style,
        presentation: {
          kind: 'plot',
          items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
        },
        members: [
          {
            target: 'mark.main',
            kind: 'mark',
            id: '__chart.scatter.mark.main',
            core: true,
            value: { type: 'point' },
            sources: [{ kind: 'type-default', path: '$recipe/scatter/mark.main' }],
          },
        ],
      }),
    ).toEqual({
      chart: { type: 'scatter', id: 'sales' },
      plot: { id: 'sales/plot' },
      style,
      presentation: {
        kind: 'plot',
        items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
      },
      members: [
        {
          target: 'mark.main',
          kind: 'mark',
          id: '__chart.scatter.mark.main',
          core: true,
          value: { type: 'point' },
          sources: [{ kind: 'type-default', path: '$recipe/scatter/mark.main' }],
        },
      ],
    });
    expect(
      ChartInspectionSchema.safeParse({
        chart: { type: 'scatter' },
        plot: {},
        style: {
          ...style,
          chart: {
            ...style.chart,
            tokenSources: style.chart.tokenSources.map((source, index) =>
              index === 0 ? { ...source, kind: 'preset' } : source,
            ),
          },
        },
        presentation: {
          kind: 'plot',
          items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
        },
        members: [],
      }).success,
    ).toBe(false);
    expect(
      ChartInspectionSchema.safeParse({
        chart: { type: 'scatter' },
        plot: {},
        style: {
          ...style,
          chart: {
            ...style.chart,
            tokenSources: style.chart.tokenSources.map((source, index) =>
              index === 0 ? { ...source, kind: ThemeTokenSource.Inherit, path: '$theme/colors/categorical' } : source,
            ),
          },
        },
        presentation: {
          kind: 'plot',
          items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
        },
        members: [],
      }).success,
    ).toBe(false);
    expect(
      ChartInspectionSchema.safeParse({
        chart: { type: 'scatter' },
        plot: {},
        style: {
          ...style,
          chart: {
            ...style.chart,
            tokenSources: style.chart.tokenSources.map((source, index) =>
              index === 0 ? { ...source, path: '$spec/chartThemeTokens/chart.padding' } : source,
            ),
          },
        },
        presentation: {
          kind: 'plot',
          items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
        },
        members: [],
      }).success,
    ).toBe(false);
    expect(
      ChartInspectionSchema.safeParse({
        chart: { type: 'scatter' },
        plot: {},
        style: {
          ...style,
          plot: {
            ...style.plot,
            authoredOverrides: [
              { kind: ThemeTokenSource.Local, path: '$spec/plotTheme' },
              { kind: ThemeTokenSource.Local, path: '$spec/plotTheme' },
            ],
          },
        },
        presentation: {
          kind: 'plot',
          items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
        },
        members: [],
      }).success,
    ).toBe(false);

    const inspectionBase = {
      chart: { type: 'scatter' },
      plot: {},
      style,
      members: [],
    } as const;
    expect(
      ChartInspectionSchema.parse({
        ...inspectionBase,
        presentation: {
          kind: 'flex-layout',
          items: [
            {
              key: 'chart.presentation.subtitle',
              kind: 'preset',
              preset: 'subtitle',
              sourcePath: '$spec/presentation/children/0',
            },
            { key: 'chart.plot', kind: 'plot', sourcePath: '$spec/presentation/children/1' },
            {
              key: 'chart.presentation.title',
              kind: 'preset',
              preset: 'title',
              sourcePath: '$spec/presentation/children/2',
            },
          ],
        },
      }).presentation.items.map(item => item.key),
    ).toEqual(['chart.presentation.subtitle', 'chart.plot', 'chart.presentation.title']);

    for (const presentation of [
      { kind: 'flex-layout', items: [] },
      {
        contentKind: 'plot',
        items: [{ key: 'chart.plot', kind: 'plot', sourcePath: '$resolved/plot' }],
      },
      {
        kind: 'flex-layout',
        items: [
          { key: 'chart.plot', kind: 'plot', sourcePath: '$spec/0' },
          { key: 'badge', kind: 'child', sourcePath: '$spec/1' },
        ],
      },
      {
        kind: 'flex-layout',
        items: [
          { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/0' },
          {
            key: 'chart.presentation.credit',
            kind: 'preset',
            preset: 'credit',
            sourcePath: '$spec/1',
          },
        ],
      },
    ] as const) {
      expect(ChartInspectionSchema.safeParse({ ...inspectionBase, presentation }).success).toBe(false);
    }
  });
});
