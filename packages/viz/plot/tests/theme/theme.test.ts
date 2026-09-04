import type { IRNode, IRPath, IRScope, ScenePrimitive } from '@retikz/core';

import { compileToScene, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRPlot, IRPlotAxisGuide } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline';
import { lowerPlot } from '../../src/pipeline/expand/lower';
import {
  resolveAxisGuideTokens,
  resolvePlotAxisGuideTheme,
  resolvePlotAxisThemeTokens,
  resolvePlotGuideTheme,
  resolvePlotTheme,
} from '../../src/resolve/theme';
import { PlotSchema, PlotThemeToken } from '../../src/schemas';

const ROWS = [
  { x: 0, y: 1, city: 'A', value: 1 },
  { x: 1, y: 2, city: 'B', value: 2 },
  { x: 2, y: 3, city: 'C', value: 3 },
];

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlot(spec, { d: ROWS }, { width: 480, height: 300 }) as IRScope;
};

const baseSpec = (override: Partial<IRPlot> = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'ordinal', name: 'color' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        color: { kind: 'field', value: 'city', scale: 'color' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
    ...override,
  });

const scopesOf = (root: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];
  const visit = (scope: IRScope): void => {
    for (const child of scope.children) {
      if (child.type === 'scope') {
        out.push(child as IRScope);
        visit(child as IRScope);
      }
    }
  };
  visit(root);
  return out;
};

const nodesOf = (root: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const visit = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const item = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (item.type === 'node') out.push(child as IRNode);
      if (item.type === 'scope' && item.children) visit(item.children);
    }
  };
  visit(root.children);
  return out;
};

const primitiveFillsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<unknown> =>
  primitives.flatMap(primitive => [
    ...('fill' in primitive ? [primitive.fill] : []),
    ...(primitive.type === 'group' ? primitiveFillsOf(primitive.children) : []),
  ]);

const pathsOf = (root: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const visit = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const item = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (item.type === 'path') out.push(child as IRPath);
      if (item.type === 'scope' && item.children) visit(item.children);
    }
  };
  visit(root.children);
  return out;
};

const hasMinimumSize = (node: IRNode, width: number, height: number): boolean => {
  const size = node.minimumSize;
  if (typeof size === 'number') return size === width && size === height;
  return size?.width === width && size.height === height;
};

const resolveAxis = (
  input: Pick<IRPlot, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'>,
  guide: IRPlotAxisGuide,
  style: string | undefined = undefined,
): IRPlotAxisGuide => {
  const effectiveTheme = {
    ...(style === undefined ? {} : { style }),
    mode: ThemeMode.Light,
    colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
  };
  const resolution = resolvePlotTheme(effectiveTheme, input);
  const guideTheme = resolvePlotGuideTheme(resolution.plotTheme, resolution.palette);
  const tokens = resolvePlotAxisThemeTokens(resolution, guide.dimension);
  return resolveAxisGuideTokens(resolvePlotAxisGuideTheme(guideTheme, tokens), guide);
};

describe('plot theme schema and lowering', () => {
  it('accepts_json_safe_theme_and_rejects_unknown_keys', () => {
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            plotArea: { fill: '#ffffff' },
            typography: { font: { size: 11 }, textColor: '#334155' },
            axis: { grid: { stroke: '#cbd5e1', drawOpacity: 0.5 } },
            legend: { swatchSize: 12, label: { textColor: '#475569' } },
            palette: { categorical: ['#2563eb'], sequential: 'magma', diverging: 'rdbu' },
          },
        }),
      ),
    ).not.toThrow();

    expect(() =>
      PlotSchema.parse({
        ...baseSpec(),
        plotTheme: { background: '#ffffff' },
      }),
    ).toThrow();

    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: { palette: { categorical: ['#2563eb'], unknown: true } } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
  });

  it('background_emits_the_effective_plot_area_before_plot_content', () => {
    const root = expandOf(
      baseSpec({
        id: 'background-plot',
        guides: [
          { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, title: 'x' },
          { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, title: 'y' },
        ],
        plotTheme: { plotArea: { fill: '#f8fafc' } },
      }),
    );
    const content = root.children[0] as IRScope;
    const background = content.children[0] as IRNode;
    const plotAreaCarrier = root.children[1] as IRNode;

    expect(background.type).toBe('node');
    expect(background.fill).toBe('#f8fafc');
    expect(background.position).toEqual(plotAreaCarrier.position);
    expect(background.minimumSize).toEqual(plotAreaCarrier.minimumSize);
    expect(hasMinimumSize(background, 480, 300)).toBe(false);
  });

  it('polar_background_uses_the_coordinate_circle_instead_of_the_plot_rectangle', () => {
    const root = expandOf(
      baseSpec({
        coordinate: { type: 'polar2D', angle: 'x', radius: 'y' },
        plotTheme: { plotArea: { fill: '#f8fafc' } },
      }),
    );
    const background = root.children[0] as IRNode;

    expect(background).toMatchObject({
      type: 'node',
      shape: 'circle',
      position: [240, 150],
      minimumSize: 300,
      fill: '#f8fafc',
    });
  });

  it.each([
    ['cartesian1D', { type: 'cartesian1D', x: 'x' }],
    ['polar1D', { type: 'polar1D', angle: 'x' }],
  ] as const)('%s_does_not_emit_a_plot_area', (_type, coordinate) => {
    const fill = '#f8fafc';
    const id = `${coordinate.type}-plot`;
    const root = expandOf(
      baseSpec({
        id,
        coordinate,
        marks: [{ type: 'point', encoding: { x: { field: 'x' } } }],
        plotTheme: { plotArea: { fill } },
      }),
    );

    expect(nodesOf(root).some(node => node.fill === fill)).toBe(false);
    expect(nodesOf(root).some(node => node.id === `${id}.plotArea`)).toBe(false);
  });

  it('facet_background_emits_one_plot_area_inside_each_panel', () => {
    const root = expandOf(
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        id: 'facet-background',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        composition: {
          defaultView: 'root',
          views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
          arrangements: [
            {
              kind: 'facet',
              id: 'city',
              view: 'root',
              column: { field: 'city', order: ['A', 'B', 'C'] },
            },
          ],
          spacing: { panelGap: 24 },
          resolve: { axis: { x: 'local', y: 'local' }, grid: { x: 'local', y: 'local' } },
        },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        guides: [
          { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, grid: true },
          { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, grid: true },
        ],
        plotTheme: { plotArea: { fill: '#e2e8f0' } },
      }),
    );
    const content = root.children[0] as IRScope;
    const panels = scopesOf(content).filter(scope => scope.meta?.layer === 'facetPanel');

    expect(content.children[0]?.type).toBe('scope');
    expect(panels).toHaveLength(3);
    for (const panel of panels) {
      const background = panel.children[0] as IRNode;
      expect(background).toMatchObject({ type: 'node', fill: '#e2e8f0' });
      expect(hasMinimumSize(background, 144, 300)).toBe(false);
    }
  });

  it('Scene 与 Scope effective Theme 进入 Plot lowering', () => {
    const scene = compileToScene(
      {
        version: 1,
        type: 'scene',
        theme: { mode: ThemeMode.Dark },
        children: [
          baseSpec({ id: 'scene-theme-plot' }),
          {
            type: 'scope',
            theme: { mode: ThemeMode.Light },
            children: [baseSpec({ id: 'scope-theme-plot' })],
          },
        ],
      },
      { composites: lowerPlots({ d: ROWS }, { width: 480, height: 300 }) },
    ).scene;
    const fills = primitiveFillsOf(scene.primitives);

    expect(fills).toContain(resolveDefaultCoreThemeColors(ThemeMode.Dark).categorical[0]);
    expect(fills).toContain(resolveDefaultCoreThemeColors(ThemeMode.Light).categorical[0]);
  });

  it('theme_palette_categorical_drives_ordinal_scale', () => {
    const root = expandOf(
      baseSpec({
        plotTheme: { palette: { categorical: ['#111111', '#222222'] } },
      }),
    );
    const markLayer = root.children[0] as IRScope;
    const colorScopes = markLayer.children as Array<IRScope>;
    expect(colorScopes.map(scope => scope.nodeDefault?.fill)).toEqual(['#111111', '#222222']);
  });

  it('explicit_scale_range_beats_theme_palette', () => {
    const root = expandOf(
      baseSpec({
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
          { type: 'ordinal', name: 'color', range: ['#aaaaaa', '#bbbbbb'] },
        ],
        plotTheme: { palette: { categorical: ['#111111', '#222222'] } },
      }),
    );
    const markLayer = root.children[0] as IRScope;
    const colorScopes = markLayer.children as Array<IRScope>;
    expect(colorScopes.map(scope => scope.nodeDefault?.fill)).toEqual(['#aaaaaa', '#bbbbbb']);
  });

  it('theme_palette_series_drives_marks_without_color_encoding', () => {
    const root = expandOf(
      baseSpec({
        marks: [
          { type: 'path', order: 'x', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
          { type: 'interval', encoding: { x: { field: 'x' }, y: { field: 'value' } } },
        ],
        plotTheme: { palette: { series: ['#0f766e', '#f97316'] } },
      }),
    );
    const [lineLayer, intervalLayer] = root.children as Array<IRScope>;
    expect(lineLayer.pathDefault?.stroke).toBe('#0f766e');
    expect(intervalLayer.nodeDefault?.fill).toBe('#f97316');
  });

  it('axis_theme_tokens_merge_with_local_guide_override', () => {
    const root = expandOf(
      baseSpec({
        guides: [
          {
            type: 'axis',
            dimension: 'x',
            grid: { stroke: '#ef4444', dashOffset: 2 },
            tickLabels: { textColor: '#2563eb' },
          },
        ],
        plotTheme: {
          axis: {
            line: { lineCap: 'round' },
            ticks: { mark: { kind: 'circle', size: 4, fill: '#111827' } },
            grid: { stroke: '#94a3b8', drawOpacity: 0.4, dashPattern: [4, 2], dashOffset: 5 },
            tickLabels: { textColor: '#475569', font: { size: 10 } },
          },
        },
      }),
    );
    const gridPath = pathsOf(root).find(path => path.strokeOpacity === 0.4);
    expect(gridPath?.stroke).toBe('#ef4444');
    expect(gridPath?.dashPattern).toEqual([4, 2]);
    expect(gridPath?.dashOffset).toBe(2);
    expect(pathsOf(root).some(path => path.lineCap === 'round')).toBe(true);
    expect(nodesOf(root).some(node => node.shape === 'circle' && node.fill === '#111827')).toBe(true);
    const labels = nodesOf(root).filter(node => node.text !== undefined && node.textColor !== undefined);
    expect(labels.every(label => label.textColor === '#2563eb')).toBe(true);
    expect(labels.every(label => label.font?.size === 10)).toBe(true);
  });

  it('Axis rule 按开放 dimension 控制 line、tick、label、title 与 grid，后声明规则优先', () => {
    const input = {
      plotThemeTokenRules: [
        {
          select: { dimension: ['x', 'radius'] },
          tokens: {
            [PlotThemeToken.AxisLineEnabled]: false,
            [PlotThemeToken.AxisTickMark]: false,
            [PlotThemeToken.AxisTickLabelEnabled]: false,
            [PlotThemeToken.AxisTitleForeground]: '#7c3aed',
            [PlotThemeToken.AxisGridEnabled]: true,
          },
        },
        {
          select: { dimension: 'x' },
          tokens: {
            [PlotThemeToken.AxisTickLabelEnabled]: true,
            [PlotThemeToken.AxisGridStroke]: '#ef4444',
          },
        },
      ],
    } satisfies Pick<IRPlot, 'plotThemeTokenRules'>;

    const x = resolveAxis(input, { type: 'axis', dimension: 'x', title: 'x' });
    const radius = resolveAxis(input, { type: 'axis', dimension: 'radius', title: 'r' });

    expect(x.line).toBe(false);
    expect(x.ticks?.mark).toBe(false);
    expect(x.tickLabels).not.toBe(false);
    expect(x.title).toMatchObject({ text: 'x', textColor: '#7c3aed' });
    expect(x.grid).toMatchObject({ stroke: '#ef4444' });
    expect(radius.tickLabels).toBe(false);
    expect(radius.grid).toMatchObject({ stroke: 'currentColor' });
  });

  it('用户全局 token 高于 style rule，local rule 高于用户全局 token，native 与 guide 依次更高', () => {
    expect(
      resolveAxis({ plotThemeTokens: { [PlotThemeToken.AxisGridEnabled]: false } }, { type: 'axis', dimension: 'y' })
        .grid,
    ).toBe(false);

    const input = {
      plotThemeTokens: {
        [PlotThemeToken.AxisGridEnabled]: false,
        [PlotThemeToken.AxisGridStroke]: '#94a3b8',
        [PlotThemeToken.AxisGridIncludeDomain]: false,
      },
      plotThemeTokenRules: [
        {
          select: { dimension: 'y' },
          tokens: {
            [PlotThemeToken.AxisGridEnabled]: true,
            [PlotThemeToken.AxisGridStroke]: '#2563eb',
            [PlotThemeToken.AxisGridIncludeDomain]: true,
          },
        },
      ],
      plotTheme: {
        axis: { grid: { stroke: '#f97316', dashPattern: [4, 2], includeDomain: false } },
      },
    } satisfies Pick<IRPlot, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'>;

    const y = resolveAxis(input, {
      type: 'axis',
      dimension: 'y',
      grid: { strokeWidth: 2, dashOffset: 1 },
    });

    expect(y.grid).toEqual({
      stroke: '#f97316',
      strokeWidth: 2,
      drawOpacity: 0.15,
      dashPattern: [4, 2],
      dashOffset: 1,
      includeDomain: false,
    });

    expect(
      resolveAxis(input, {
        type: 'axis',
        dimension: 'y',
        grid: { includeDomain: true },
      }).grid,
    ).toMatchObject({ includeDomain: true });
    expect(resolveAxis(input, { type: 'axis', dimension: 'y', grid: false }).grid).toBe(false);
  });

  it('endpoint token 不创建 grid，disabled Theme 下的 grid shorthand 不恢复休眠默认', () => {
    const disabled = {
      plotThemeTokens: {
        [PlotThemeToken.AxisGridEnabled]: false,
        [PlotThemeToken.AxisGridIncludeDomain]: true,
      },
    } satisfies Pick<IRPlot, 'plotThemeTokens'>;

    expect(resolveAxis(disabled, { type: 'axis', dimension: 'x' }).grid).toBe(false);
    expect(resolveAxis(disabled, { type: 'axis', dimension: 'x', grid: true }).grid).toBe(true);
  });

  it('内建 style 只通过 rule 改变已有 Axis grid，且不会创建 minor grid', () => {
    const cases: Array<{ dimensions: Array<string> }> = [{ dimensions: ['x', 'y'] }];

    for (const { dimensions } of cases) {
      for (const dimension of ['x', 'y']) {
        const grid = resolveAxis({}, { type: 'axis', dimension }).grid;
        if (dimensions.some(candidate => candidate === dimension)) {
          expect(grid).toMatchObject({
            stroke: 'currentColor',
            includeDomain: true,
          });
        } else {
          expect(grid).toBe(false);
        }
      }
    }

    const localMinor = { ticks: { values: [0.5] }, dashOffset: 3 };
    expect(resolveAxis({}, { type: 'axis', dimension: 'y', grid: { minor: localMinor } }).grid).toMatchObject({
      stroke: 'currentColor',
      minor: localMinor,
    });
  });

  it('typography_supplies_axis_text_defaults_beneath_axis_and_guide_styles', () => {
    const root = expandOf(
      baseSpec({
        guides: [
          {
            type: 'axis',
            dimension: 'x',
            title: { text: 'Revenue', textColor: '#dc2626', font: { weight: 700 } },
          },
        ],
        plotTheme: {
          typography: {
            font: { family: 'Source Serif 4', size: 15 },
            textColor: '#0f766e',
            lineHeight: 1.4,
          },
          axis: {
            tickLabels: { textColor: '#2563eb', font: { size: 10 } },
            title: { textColor: '#7c3aed', font: { size: 13 } },
          },
        },
      }),
    );
    const textNodes = nodesOf(root).filter(node => node.text !== undefined);
    const title = textNodes.find(node => node.text === 'Revenue');
    const tickLabels = textNodes.filter(node => node.text !== 'Revenue');

    expect(tickLabels.length).toBeGreaterThan(0);
    expect(tickLabels.every(label => label.font?.family === 'Source Serif 4')).toBe(true);
    expect(tickLabels.every(label => label.font?.size === 10)).toBe(true);
    expect(tickLabels.every(label => label.textColor === '#2563eb')).toBe(true);
    expect(tickLabels.every(label => label.lineHeight === 1.4)).toBe(true);
    expect(title).toMatchObject({
      textColor: '#dc2626',
      lineHeight: 1.4,
      font: { family: 'Source Serif 4', size: 13, weight: 700 },
    });
  });

  it('axis_tick_label_local_layout_overrides_theme_layout', () => {
    const root = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'x', tickLabels: { rotate: 0, layout: false, textColor: '#0891b2' } }],
        plotTheme: {
          axis: {
            tickLabels: {
              rotate: -90,
              layout: { hide: { strategy: 'greedy' } },
            },
          },
        },
      }),
    );
    const labels = nodesOf(root).filter(node => node.textColor === '#0891b2');

    expect(labels.length).toBeGreaterThan(3);
    expect(labels.every(label => label.rotate === 0)).toBe(true);
  });

  it('axis_title_local_orientation_overrides_theme_rotate', () => {
    const root = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'y', title: { text: 'y', orientation: 'horizontal' } }],
        plotTheme: {
          axis: {
            title: { rotate: 90 },
          },
        },
      }),
    );
    const title = nodesOf(root).find(node => node.text === 'y');

    expect(title?.rotate).toBe(0);
  });

  it('axis_title_local_padding_overrides_theme_padding', () => {
    const root = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'x', title: { text: 'x', padding: 4 } }],
        plotTheme: {
          axis: {
            title: { padding: 20 },
          },
        },
      }),
    );
    const themeRoot = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'x', title: 'x' }],
        plotTheme: {
          axis: {
            title: { padding: 20 },
          },
        },
      }),
    );
    const title = nodesOf(root).find(node => node.text === 'x');
    const themeTitle = nodesOf(themeRoot).find(node => node.text === 'x');

    expect((themeTitle?.position as [number, number])[1] - (title?.position as [number, number])[1]).toBe(16);
  });

  it('theme_axis_rejects_structural_crossing_endpoint_and_title_controls', () => {
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              crossing: { tick: 'hide' },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              ticks: { endpoint: { hideWhenArrow: true } },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { placement: 'at-end' },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { orientation: 'horizontal' },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { gap: 4 },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { anchor: { align: 'end' } },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { shift: { normal: 2 } },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSchema.parse(
        baseSpec({
          plotTheme: {
            axis: {
              title: { layout: false },
            },
          } as IRPlot['plotTheme'],
        }),
      ),
    ).toThrow();
  });

  it('legend_local_style_overrides_theme_legend_tokens', () => {
    const root = expandOf(
      baseSpec({
        guides: [
          {
            type: 'legend',
            channel: 'color',
            scale: 'color',
            style: { swatchSize: 8, label: { textColor: '#dc2626' } },
          },
        ],
        plotTheme: { legend: { swatchSize: 20, label: { textColor: '#475569' } } },
      }),
    );
    const legend = scopesOf(root).find(scope => typeof scope.id === 'string' && scope.id.startsWith('legend'));
    expect(legend).toBeDefined();
    const swatches = (legend as IRScope).children.filter(
      (child): child is IRNode => child.type === 'node' && child.text === undefined,
    );
    const labels = (legend as IRScope).children.filter(
      (child): child is IRNode => child.type === 'node' && child.text !== undefined,
    );
    expect(swatches.every(node => hasMinimumSize(node, 8, 8))).toBe(true);
    expect(labels.every(node => node.textColor === '#dc2626')).toBe(true);
  });
});
