import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline';
import { PlotSpecSchema } from '../../src/schemas';

const ROWS = [
  { x: 0, y: 1, city: 'A', value: 1 },
  { x: 1, y: 2, city: 'B', value: 2 },
  { x: 2, y: 3, city: 'C', value: 3 },
];

const expandOf = (spec: IRPlotSpec): IRScope => {
  const [def] = lowerPlots({ d: ROWS }, { width: 480, height: 300 });
  return def.expand(spec) as IRScope;
};

const baseSpec = (override: Partial<IRPlotSpec> = {}): IRPlotSpec =>
  PlotSpecSchema.parse({
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

describe('plot theme schema and lowering', () => {
  it('accepts_json_safe_theme_and_rejects_unknown_keys', () => {
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            background: '#ffffff',
            typography: { font: { size: 11 }, textColor: '#334155' },
            axis: { grid: { stroke: '#cbd5e1', drawOpacity: 0.5 } },
            legend: { swatchSize: 12, label: { textColor: '#475569' } },
            palette: { categorical: ['#2563eb'], sequential: 'magma', diverging: 'rdbu' },
          },
        }),
      ),
    ).not.toThrow();

    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: { palette: { categorical: ['#2563eb'], unknown: true } } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
  });

  it('background_emits_panel_background_when_configured', () => {
    const root = expandOf(baseSpec({ theme: { background: '#f8fafc' } }));
    const background = root.children[0] as IRNode;
    expect(background.type).toBe('node');
    expect(background.fill).toBe('#f8fafc');
    expect(hasMinimumSize(background, 480, 300)).toBe(true);
  });

  it('theme_palette_categorical_beats_colors_for_ordinal_scale', () => {
    const root = expandOf(
      baseSpec({
        colors: ['#000000'],
        theme: { palette: { categorical: ['#111111', '#222222'] } },
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
        theme: { palette: { categorical: ['#111111', '#222222'] } },
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
        theme: { palette: { series: ['#0f766e', '#f97316'] } },
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
        theme: {
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

  it('axis_tick_label_local_layout_overrides_theme_layout', () => {
    const root = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'x', tickLabels: { rotate: 0, layout: false, textColor: '#0891b2' } }],
        theme: {
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
        theme: {
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
        theme: {
          axis: {
            title: { padding: 20 },
          },
        },
      }),
    );
    const themeRoot = expandOf(
      baseSpec({
        guides: [{ type: 'axis', dimension: 'x', title: 'x' }],
        theme: {
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
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              crossing: { tick: 'hide' },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              ticks: { endpoint: { hideWhenArrow: true } },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { placement: 'at-end' },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { orientation: 'horizontal' },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { gap: 4 },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { anchor: { align: 'end' } },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { shift: { normal: 2 } },
            },
          } as IRPlotSpec['theme'],
        }),
      ),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse(
        baseSpec({
          theme: {
            axis: {
              title: { layout: false },
            },
          } as IRPlotSpec['theme'],
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
        theme: { legend: { swatchSize: 20, label: { textColor: '#475569' } } },
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
