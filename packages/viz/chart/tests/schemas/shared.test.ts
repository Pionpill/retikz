import { resolveCoreThemeColors, ThemeMode, ThemeStyle, ThemeTokenSource } from '@retikz/core';
import { resolvePlotTheme } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { ChartInspectionSchema } from '../../src/inspection';
import { ChartSharedSchema } from '../../src/schemas/common';
import { ChartThemeToken, getChartThemePreset } from '../../src/style';

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
        plotTheme: { background: '#ffffff' },
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
      plotTheme: { background: '#ffffff' },
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

  it('通过 shared owner fragment 接受 presentation', () => {
    expect(
      ChartSharedSchema.parse({
        data: { reference: 'rows' },
        presentation: {
          layout: { gap: { column: 0, row: 6 }, alignItems: 'start' },
          children: [{ content: { kind: 'preset', preset: 'title', text: 'Revenue' } }, { content: { kind: 'plot' } }],
        },
      }),
    ).toMatchObject({
      presentation: {
        layout: { gap: { column: 0, row: 6 }, alignItems: 'start' },
        children: [{ content: { kind: 'preset', preset: 'title', text: 'Revenue' } }, { content: { kind: 'plot' } }],
      },
    });
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
    const tokens = getChartThemePreset('neutral', 'light');
    const style = {
      chart: {
        style: 'neutral',
        mode: 'light',
        tokens,
        tokenSources: Object.values(ChartThemeToken).map(token => ({
          token,
          kind: ThemeTokenSource.Local,
          path: `$style/neutral/light/${token}`,
        })),
      },
      plot: resolvePlotTheme({
        style: ThemeStyle.Neutral,
        mode: ThemeMode.Light,
        colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
      }),
    } as const;
    expect(
      ChartInspectionSchema.parse({
        chart: { type: 'scatter', id: 'sales' },
        plot: { id: 'sales/plot' },
        style,
        presentation: {
          contentKind: 'plot',
          items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
        contentKind: 'plot',
        items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
          contentKind: 'plot',
          items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
          contentKind: 'plot',
          items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
          contentKind: 'plot',
          items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
          contentKind: 'plot',
          items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
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
          contentKind: 'flex-layout',
          items: [
            {
              key: 'chart.presentation.credit',
              contentKind: 'preset',
              preset: 'credit',
              sourcePath: '$spec/presentation/children/0',
            },
            { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/presentation/children/1' },
            { key: 'badge', contentKind: 'child', sourcePath: '$spec/presentation/children/2' },
          ],
        },
      }).presentation.items.map(item => item.key),
    ).toEqual(['chart.presentation.credit', 'chart.plot', 'badge']);

    for (const presentation of [
      { contentKind: 'flex-layout', items: [] },
      {
        contentKind: 'plot',
        items: [{ key: 'chart.presentation.title', contentKind: 'preset', preset: 'title', sourcePath: '$spec/x' }],
      },
      {
        contentKind: 'flex-layout',
        items: [
          { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/0' },
          { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/1' },
        ],
      },
      {
        contentKind: 'flex-layout',
        items: [
          { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/0' },
          { key: 'chart.plot', contentKind: 'child', sourcePath: '$spec/1' },
        ],
      },
    ] as const) {
      expect(ChartInspectionSchema.safeParse({ ...inspectionBase, presentation }).success).toBe(false);
    }
  });
});
