import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { compileToScene, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRPlot, IRPlotAxisGuide } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline';
import { lowerPlot } from '../../src/pipeline/expand/lower';
import {
  resolveAxisGuideTokens,
  resolveLegendGuideTokens,
  resolvePlotAxisGuideTheme,
  resolvePlotGuideTheme,
  resolvePlotTheme,
} from '../../src/resolve/theme';
import { PlotSchema } from '../../src/schemas';

const ROWS = [
  { x: 0, y: 1, city: 'A', value: 1 },
  { x: 1, y: 2, city: 'B', value: 2 },
  { x: 2, y: 3, city: 'C', value: 3 },
];

const expandOf = (spec: IRPlot): IRScope => lowerPlot(spec, { d: ROWS }, { width: 480, height: 300 }) as IRScope;

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
      if (child.type !== 'scope') continue;
      out.push(child as IRScope);
      visit(child as IRScope);
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

const primitiveFillsOf = (primitives: ReadonlyArray<unknown>): Array<unknown> =>
  primitives.flatMap(primitive => {
    if (primitive === null || typeof primitive !== 'object') return [];
    const item = primitive as { fill?: unknown; type?: string; children?: ReadonlyArray<unknown> };
    return [
      ...(Object.hasOwn(item, 'fill') ? [item.fill] : []),
      ...(item.type === 'group' && item.children !== undefined ? primitiveFillsOf(item.children) : []),
    ];
  });

const resolveAxis = (
  input: Pick<IRPlot, 'plotDefaults' | 'plotRules'>,
  guide: IRPlotAxisGuide,
): ReturnType<typeof resolveAxisGuideTokens> => {
  const resolution = resolvePlotTheme(
    { mode: ThemeMode.Light, colors: resolveDefaultCoreThemeColors(ThemeMode.Light) },
    input,
  );
  return resolveAxisGuideTokens(resolvePlotAxisGuideTheme(resolution, guide.dimension), guide);
};

describe('Plot Source defaults and guide lowering', () => {
  it('background emits the effective plot area before plot content', () => {
    const root = expandOf(
      baseSpec({
        id: 'background-plot',
        guides: [
          { type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'bottom' }, title: 'x' },
          { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'left' }, title: 'y' },
        ],
        plotDefaults: { plotArea: { fill: '#f8fafc' } },
      }),
    );
    const content = root.children[0] as IRScope;
    const background = content.children[0] as IRNode;
    const plotAreaCarrier = root.children[1] as IRNode;

    expect(background).toMatchObject({ type: 'node', style: { fill: '#f8fafc' } });
    expect(background.position).toEqual(plotAreaCarrier.position);
    expect(background.layout?.minimumSize).toEqual(plotAreaCarrier.layout?.minimumSize);
  });

  it('polar background uses the coordinate circle instead of the plot rectangle', () => {
    const root = expandOf(
      baseSpec({
        coordinate: { type: 'polar2D', angle: 'x', radius: 'y' },
        plotDefaults: { plotArea: { fill: '#f8fafc' } },
      }),
    );
    expect(root.children[0]).toMatchObject({
      type: 'node',
      shape: 'circle',
      position: [240, 150],
      style: { fill: '#f8fafc' },
      layout: { minimumSize: 300 },
    });
  });

  it.each([
    ['cartesian1D', { type: 'cartesian1D', x: 'x' }, { type: 'point', encoding: { x: { field: 'x' } } }],
    ['polar1D', { type: 'polar1D', angle: 'x' }, { type: 'point', encoding: { x: { field: 'x' } } }],
  ] as const)('%s does not emit a plot area', (_name, coordinate, mark) => {
    const fill = '#f8fafc';
    const root = expandOf(baseSpec({ coordinate, marks: [mark], plotDefaults: { plotArea: { fill } } }));

    expect(nodesOf(root).some(node => node.style?.fill === fill)).toBe(false);
    expect(nodesOf(root).some(node => node.id?.endsWith('.plotArea'))).toBe(false);
  });

  it('Scene and Scope effective Theme reach Plot palette defaults', () => {
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

  it('facet panels receive plot area defaults independently', () => {
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
        plotDefaults: { plotArea: { fill: '#e2e8f0' } },
      }),
    );
    const content = root.children[0] as IRScope;
    const panels = scopesOf(content).filter(scope => scope.meta?.layer === 'facetPanel');

    expect(panels).toHaveLength(3);
    expect(panels.every(panel => (panel.children[0] as IRNode).style?.fill === '#e2e8f0')).toBe(true);
  });

  it('plotDefaults palette categorical drives an ordinal scale', () => {
    const root = expandOf(baseSpec({ plotDefaults: { palette: { categorical: ['#111111', '#222222'] } } }));
    const markLayer = root.children[0] as IRScope;
    const colorScopes = markLayer.children as Array<IRScope>;
    expect(colorScopes.map(scope => scope.defaults?.node?.style?.fill)).toEqual(['#111111', '#222222']);
  });

  it('explicit scale range beats plotDefaults palette', () => {
    const root = expandOf(
      baseSpec({
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
          { type: 'ordinal', name: 'color', range: ['#aaaaaa', '#bbbbbb'] },
        ],
        plotDefaults: { palette: { categorical: ['#111111', '#222222'] } },
      }),
    );
    const markLayer = root.children[0] as IRScope;
    const colorScopes = markLayer.children as Array<IRScope>;
    expect(colorScopes.map(scope => scope.defaults?.node?.style?.fill)).toEqual(['#aaaaaa', '#bbbbbb']);
  });

  it('plotDefaults series drives marks without color encoding', () => {
    const root = expandOf(
      baseSpec({
        marks: [
          { type: 'path', order: 'x', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
          { type: 'interval', encoding: { x: { field: 'x' }, y: { field: 'value' } } },
        ],
        plotDefaults: { palette: { series: ['#0f766e', '#f97316'] } },
      }),
    );
    const [lineLayer, intervalLayer] = root.children as Array<IRScope>;
    expect(lineLayer.defaults?.path?.style?.stroke).toBe('#0f766e');
    expect(intervalLayer.defaults?.node?.style?.fill).toBe('#f97316');
  });

  it('axis defaults merge with local guide fields while preserving source field precedence', () => {
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
        plotDefaults: {
          axis: {
            line: { lineCap: 'round' },
            ticks: { mark: { kind: 'circle', size: 4, fill: '#111827' } },
            grid: { stroke: '#94a3b8', drawOpacity: 0.4, dashPattern: [4, 2], dashOffset: 5 },
            tickLabels: { textColor: '#475569', font: { size: 10 } },
          },
        },
      }),
    );
    const gridPath = pathsOf(root).find(path => path.style?.strokeOpacity === 0.4);
    expect(gridPath?.style?.stroke).toBe('#ef4444');
    expect(gridPath?.style?.dashPattern).toEqual([4, 2]);
    expect(gridPath?.style?.dashOffset).toBe(2);
    expect(pathsOf(root).some(path => path.style?.lineCap === 'round')).toBe(true);
    expect(nodesOf(root).some(node => node.shape === 'circle' && node.style?.fill === '#111827')).toBe(true);
    const labels = nodesOf(root).filter(node => node.text !== undefined && node.style?.textColor !== undefined);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.style?.textColor === '#2563eb')).toBe(true);
    expect(labels.every(label => label.style?.font?.size === 10)).toBe(true);
  });

  it('Axis rules match open dimensions and later rules win', () => {
    const input = {
      plotRules: [
        {
          select: { dimension: ['x', 'radius'] },
          axis: {
            line: false,
            ticks: { mark: false },
            tickLabels: false,
            title: { textColor: '#7c3aed' },
            grid: { stroke: '#94a3b8' },
          },
        },
        { select: { dimension: 'x' }, axis: { tickLabels: { textColor: '#2563eb' }, grid: { stroke: '#ef4444' } } },
      ],
    } satisfies Pick<IRPlot, 'plotRules'>;

    const x = resolveAxis(input, { type: 'axis', dimension: 'x', title: 'x' });
    const radius = resolveAxis(input, { type: 'axis', dimension: 'radius', title: 'r' });

    expect(x.line).toBe(false);
    expect(x.ticks?.mark).toBe(false);
    expect(x.tickLabels).toMatchObject({ textColor: '#2563eb' });
    expect(x.title).toMatchObject({ text: 'x', textColor: '#7c3aed' });
    expect(x.grid).toMatchObject({ stroke: '#ef4444' });
    expect(radius.tickLabels).toBe(false);
    expect(radius.grid).toMatchObject({ stroke: '#94a3b8' });
  });

  it('Plot defaults reject structural Axis controls owned by guides', () => {
    const invalidDefaults = [
      { axis: { crossing: { tick: 'hide' } } },
      { axis: { ticks: { endpoint: { hideWhenArrow: true } } } },
      { axis: { title: { placement: 'at-end' } } },
      { axis: { title: { orientation: 'horizontal' } } },
      { axis: { title: { gap: 4 } } },
      { axis: { title: { anchor: { align: 'end' } } } },
      { axis: { title: { shift: { normal: 2 } } } },
      { axis: { title: { layout: false } } },
    ];

    for (const plotDefaults of invalidDefaults) {
      expect(PlotSchema.safeParse({ ...baseSpec(), plotDefaults }).success).toBe(false);
    }
  });

  it('typography defaults supply guide text while specialized and explicit fonts replace as whole values', () => {
    const root = expandOf(
      baseSpec({
        guides: [
          {
            type: 'axis',
            dimension: 'x',
            title: { text: 'Revenue', textColor: '#dc2626', font: { weight: 700 } },
          },
        ],
        plotDefaults: {
          typography: { font: { family: 'Source Serif 4', size: 15 }, textColor: '#0f766e', lineHeight: 1.4 },
          axis: { tickLabels: { textColor: '#2563eb', font: { size: 10 } } },
        },
      }),
    );
    const textNodes = nodesOf(root).filter(node => node.text !== undefined);
    const title = textNodes.find(node => node.text === 'Revenue');
    const tickLabels = textNodes.filter(node => node.text !== 'Revenue');

    expect(tickLabels.length).toBeGreaterThan(0);
    expect(tickLabels.every(label => label.style?.font?.family === undefined)).toBe(true);
    expect(tickLabels.every(label => label.style?.font?.size === 10)).toBe(true);
    expect(tickLabels.every(label => label.style?.textColor === '#2563eb')).toBe(true);
    expect(tickLabels.every(label => label.layout?.lineHeight === 1.4)).toBe(true);
    expect(title).toMatchObject({
      style: { textColor: '#dc2626', font: { weight: 700 } },
      layout: { lineHeight: 1.4 },
    });
  });

  it('axis local layout, orientation and padding override Plot defaults', () => {
    const root = expandOf(
      baseSpec({
        guides: [
          { type: 'axis', dimension: 'x', tickLabels: { rotate: 0, layout: false, textColor: '#0891b2' } },
          { type: 'axis', dimension: 'y', title: { text: 'y', orientation: 'horizontal' } },
        ],
        plotDefaults: { axis: { tickLabels: { rotate: -90 }, title: { rotate: 90, padding: 20 } } },
      }),
    );
    const labels = nodesOf(root).filter(node => node.style?.textColor === '#0891b2');
    const title = nodesOf(root).find(node => node.text === 'y');

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.rotate === 0)).toBe(true);
    expect(title?.rotate).toBe(0);

    expect(
      resolveAxis(
        { plotDefaults: { axis: { title: { padding: 20 } } } },
        { type: 'axis', dimension: 'x', title: { text: 'x', padding: 4 } },
      ).title,
    ).toMatchObject({ padding: 4 });
  });

  it('Axis defaults preserve local minor grid semantics', () => {
    const grid = resolveAxis(
      {},
      { type: 'axis', dimension: 'x', grid: { minor: { ticks: { values: [0.5] }, dashOffset: 3 } } },
    ).grid;

    expect(grid).toMatchObject({ includeDomain: true, minor: { ticks: { values: [0.5] }, dashOffset: 3 } });
  });

  it('legend local style overrides Plot legend defaults', () => {
    const resolution = resolvePlotTheme(
      { mode: ThemeMode.Light, colors: resolveDefaultCoreThemeColors(ThemeMode.Light) },
      { plotDefaults: { legend: { swatchSize: 20, label: { textColor: '#475569' } } } },
    );
    const theme = resolvePlotGuideTheme(resolution);
    const legend = resolveLegendGuideTokens(theme, { swatchSize: 8, label: { textColor: '#dc2626' } });

    expect(legend.swatchSize).toBe(8);
    expect(legend.label.textColor).toBe('#dc2626');
    expect(legend.title.textColor).toBe('currentColor');
  });
});
