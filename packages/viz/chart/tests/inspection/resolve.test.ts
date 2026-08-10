import { ThemeTokenSource } from '@retikz/core';
import { PlotThemeToken } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';
import { ChartThemeToken } from '../../src/style';

describe('Chart inspection', () => {
  it('按最终 Plot collection 顺序输出完整 member literal', () => {
    const result = resolveChartSpec({
      namespace: 'chart',
      type: 'scatter',
      id: 'sales',
      data: { reference: 'rows' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      transform: [{ kind: 'sort', field: 'margin', order: 'descending' }],
      scales: [
        { type: 'log', name: '__chart.scatter.scale.x', base: 2 },
        { type: 'linear', name: 'z' },
      ],
      mark: { opacity: { kind: 'constant', value: 0.5 } },
      marks: [
        {
          type: 'point',
          id: 'user.mark',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
    });

    const { style, ...inspection } = result.inspection;
    expect(style.chart).toMatchObject({ style: 'neutral', mode: 'light' });
    expect(style.chart.tokenSources).toHaveLength(37);
    expect(style.chart.tokenSources[0]).toEqual({
      token: ChartThemeToken.ChartCanvasFill,
      kind: ThemeTokenSource.Local,
      path: '$style/neutral/light/chart.canvas.fill',
    });
    expect(style.plot).toMatchObject({ style: 'neutral', mode: 'light', authoredOverrides: [] });
    expect(style.plot.tokenSources).toHaveLength(38);
    expect(style.plot.tokenSources.find(source => source.token === PlotThemeToken.PlotPaletteCategorical)).toEqual({
      token: PlotThemeToken.PlotPaletteCategorical,
      kind: ThemeTokenSource.Local,
      path: '$style/neutral/light/plot.palette.categorical',
    });
    expect(inspection).toEqual({
      chart: { type: 'scatter', id: 'sales' },
      plot: { id: 'sales/plot' },
      presentation: {
        contentKind: 'plot',
        items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
      },
      members: [
        {
          target: 'extension.transform.0',
          kind: 'transform',
          core: false,
          value: { kind: 'sort', field: 'margin', order: 'descending' },
          sources: [{ kind: 'user-override', path: '$spec/transform/0' }],
        },
        {
          target: 'scale.x',
          kind: 'scale',
          core: true,
          value: { type: 'log', name: '__chart.scatter.scale.x', base: 2 },
          sources: [
            { kind: 'type-default', path: '$recipe/scatter/scale.x' },
            { kind: 'user-override', path: '$spec/scales/0' },
          ],
        },
        {
          target: 'scale.y',
          kind: 'scale',
          core: true,
          value: { type: 'linear', name: '__chart.scatter.scale.y' },
          sources: [{ kind: 'type-default', path: '$recipe/scatter/scale.y' }],
        },
        {
          target: 'extension.scale.2',
          kind: 'scale',
          core: false,
          value: { type: 'linear', name: 'z' },
          sources: [{ kind: 'user-override', path: '$spec/scales/1' }],
        },
        {
          target: 'coordinate.main',
          kind: 'coordinate',
          core: true,
          value: { type: 'cartesian2D', x: '__chart.scatter.scale.x', y: '__chart.scatter.scale.y' },
          sources: [{ kind: 'type-default', path: '$recipe/scatter/coordinate.main' }],
        },
        {
          target: 'mark.main',
          kind: 'mark',
          id: '__chart.scatter.mark.main',
          core: true,
          value: {
            type: 'point',
            id: '__chart.scatter.mark.main',
            encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
            opacity: { kind: 'constant', value: 0.5 },
          },
          sources: [
            { kind: 'type-default', path: '$recipe/scatter/mark.main' },
            { kind: 'user-override', path: '$spec/mark' },
          ],
        },
        {
          target: 'extension.mark.1',
          kind: 'mark',
          id: 'user.mark',
          core: false,
          value: {
            type: 'point',
            id: 'user.mark',
            encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
          },
          sources: [{ kind: 'plot-extension', path: '$spec/marks/0' }],
        },
        {
          target: 'guide.x',
          kind: 'guide',
          id: '__chart.scatter.guide.x',
          core: false,
          value: {
            type: 'axis',
            id: '__chart.scatter.guide.x',
            dimension: 'x',
          },
          sources: [{ kind: 'type-default', path: '$recipe/scatter/guide.x' }],
        },
        {
          target: 'guide.y',
          kind: 'guide',
          id: '__chart.scatter.guide.y',
          core: false,
          value: {
            type: 'axis',
            id: '__chart.scatter.guide.y',
            dimension: 'y',
            grid: true,
          },
          sources: [{ kind: 'type-default', path: '$recipe/scatter/guide.y' }],
        },
      ],
    });
  });

  it('guide replacement 使用 final-index extension target', () => {
    const result = resolveChartSpec({
      namespace: 'chart',
      type: 'scatter',
      data: { reference: 'rows' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      guides: [{ type: 'axis', id: 'user.axis', dimension: 'x' }],
    });

    expect(result.inspection.members.filter(member => member.kind === 'guide')).toEqual([
      {
        target: 'extension.guide.0',
        kind: 'guide',
        id: 'user.axis',
        core: false,
        value: { type: 'axis', id: 'user.axis', dimension: 'x' },
        sources: [{ kind: 'user-override', path: '$spec/guides/0' }],
      },
    ]);
  });

  it('按 authored order 记录 presentation item identity 与 source，不复制 payload', () => {
    const result = resolveChartSpec({
      namespace: 'chart',
      type: 'scatter',
      data: { reference: 'rows' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      presentation: {
        children: [
          {
            key: 'badge',
            content: { kind: 'child', child: { type: 'scope', id: 'badge', children: [] } },
          },
          {
            key: 'closing-credit',
            content: {
              kind: 'preset',
              preset: 'credit',
              text: { text: [{ runs: [{ text: 'Retikz', font: { style: 'italic' } }] }] },
            },
          },
          { content: { kind: 'plot' } },
          {
            content: { kind: 'preset', preset: 'title', text: { text: 'Revenue', font: { size: 20 } } },
          },
        ],
      },
    });

    expect(result.inspection.presentation).toEqual({
      contentKind: 'flex-layout',
      items: [
        {
          key: 'badge',
          contentKind: 'child',
          sourcePath: '$spec/presentation/children/0',
        },
        {
          key: 'closing-credit',
          contentKind: 'preset',
          preset: 'credit',
          sourcePath: '$spec/presentation/children/1',
        },
        {
          key: 'chart.plot',
          contentKind: 'plot',
          sourcePath: '$spec/presentation/children/2',
        },
        {
          key: 'chart.presentation.title',
          contentKind: 'preset',
          preset: 'title',
          sourcePath: '$spec/presentation/children/3',
        },
      ],
    });
    expect(JSON.stringify(result.inspection.presentation)).not.toContain('Revenue');
    expect(JSON.stringify(result.inspection.presentation)).not.toContain('font');
  });
});
