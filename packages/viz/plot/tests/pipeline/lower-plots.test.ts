import type { IRNode, IRPaint, IRPath, IRScope } from '@retikz/core';
import { compileToScene, resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../src/pipeline/expand';
import { lowerPlots } from '../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotLayerZIndex, PlotSchema } from '../../src/schemas';
import { DEFAULT_FONT_SIZE } from '../../src/shared';
import { measureLabel } from '../helpers/text-measurement';

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

const paintGradient: IRPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

const lineSpec: IRPlot = PlotSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth', domainPadding: 0 },
    { type: 'linear', name: 'yRevenue', domainPadding: 0 },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [
    { type: 'path', encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
  ],
});

const pointSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth', domainPadding: 0 },
      { type: 'linear', name: 'yRevenue', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: PlotsLoweringOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

/** 取第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: PlotsLoweringOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

const isScope = (value: unknown): value is IRScope =>
  typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'scope';

const collectScopes = (scope: IRScope): Array<IRScope> => [
  scope,
  ...scope.children.filter(isScope).flatMap(child => collectScopes(child)),
];

const collectNodes = (scope: IRScope): Array<IRNode> => [
  ...(scope.children.filter(child => child.type === 'node') as Array<IRNode>),
  ...scope.children.filter(isScope).flatMap(child => collectNodes(child)),
];

const textNodeVisualBottom = (node: IRNode): number => {
  const position = node.position as [number, number];
  const authoredFontSize = node.style?.font?.size;
  const fontSize = typeof authoredFontSize === 'number' ? authoredFontSize : DEFAULT_FONT_SIZE;
  const width = measureLabel({ type: 'node', text: String(node.text) }, fontSize).width;
  const height = typeof node.layout?.lineHeight === 'number' ? node.layout.lineHeight : fontSize;
  const radians = (Math.abs(node.rotate ?? 0) * Math.PI) / 180;
  const rotatedHeight = width * Math.abs(Math.sin(radians)) + height * Math.abs(Math.cos(radians));

  return position[1] + rotatedHeight / 2;
};

const scopeByLayerMeta = (root: IRScope, layer: string): IRScope => {
  const scope = collectScopes(root).find(item => (item.meta as { layer?: unknown } | undefined)?.layer === layer);

  expect(scope).toBeDefined();
  return scope as IRScope;
};

const nodeWidth = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return size?.width ?? size?.default ?? 0;
};

const nodeHeight = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return size?.height ?? size?.default ?? 0;
};

const opts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const sharedCategorical = resolveDefaultCoreThemeColors(ThemeMode.Light).categorical;

describe('lowerPlots（契约）', () => {
  it('自动旋转的 x 刻度标签保留在绘图分配内', () => {
    const width = 240;
    const height = 180;
    const tickValues = [100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'values' },
      scales: [
        { type: 'linear', name: 'x', domain: [100000, 900000] },
        { type: 'linear', name: 'y', domain: [0, 1] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
      guides: [
        {
          type: 'axis',
          dimension: 'x',
          ticks: { values: tickValues },
          tickLabels: { layout: { rotate: { angles: [0, -90] }, hide: false } },
        },
      ],
    });
    const lowered = expandOf(
      spec,
      {
        values: [
          { x: 100000, y: 0 },
          { x: 900000, y: 1 },
        ],
      },
      { layout: { width, height } },
    );
    const rotatedLabels = collectNodes(lowered).filter(
      node => tickValues.includes(Number(node.text)) && node.rotate === -90,
    );

    expect(rotatedLabels).toHaveLength(tickValues.length);
    expect(Math.max(...rotatedLabels.map(textNodeVisualBottom))).toBeLessThanOrEqual(height);
  });

  // Happy path
  it('标记成为图层范围', () => {
    const outer = expandOf(lineSpec, { sales: SALES }, opts);

    expect(outer.type).toBe('scope');
    expect(outer.localNamespace).toBe(true);

    // 每个 mark 下沉成一层独立 scope
    expect((outer.children[0] as IRScope).type).toBe('scope');
  });

  it('下线生产路径', () => {
    const layer = firstLayer(lineSpec, { sales: SALES }, opts);
    const path = layer.children[0] as IRPath;

    expect(path.type).toBe('path');

    // 样式上提到图层 pathDefault，path 本身只留几何
    expect(layer.defaults?.path?.style?.strokeWidth).toBe(2);

    // domain x [0,2]->[0,480]; y [9,14]->[300,0]
    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('下点产生吊装式裸节点', () => {
    const layer = firstLayer(pointSpec(), { sales: SALES }, opts);

    expect(layer.children).toHaveLength(3);

    // 样式上提：circle / fill 在图层 nodeDefault，不重复写在每个 node
    expect(layer.defaults?.node?.shape).toBe('circle');
    expect(layer.defaults?.node?.style?.fill).toBe(sharedCategorical[0]);

    // 每个 node 是裸的（只有 type + position，无 shape/fill）
    expect(layer.children.every(c => (c as IRNode).shape === undefined)).toBe(true);
    expect((layer.children[0] as IRNode).position).toEqual([0, 240]);
  });

  it('同一默认颜色组中的标记共享一个连续的调色板槽', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          defaultColorGroup: 'observations',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
        {
          type: 'point',
          defaultColorGroup: 'observations',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
        {
          type: 'point',
          defaultColorGroup: 'forecast',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
        { type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const layers = expandOf(spec, { sales: SALES }, opts).children.filter(isScope);

    expect(layers.map(layer => layer.defaults?.node?.style?.fill)).toEqual([
      sharedCategorical[0],
      sharedCategorical[0],
      sharedCategorical[1],
      sharedCategorical[2],
    ]);
  });

  it('下点采用常节点样式', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: {
            fill: '#f8fafc',
            stroke: '#0f172a',
            strokeWidth: 1.5,
            rotate: 45,
            padding: 2,
            minimumSize: { default: 14, width: 16, height: 12 },
            zIndex: 3,
            opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
          },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.node).toMatchObject({
      shape: 'circle',
      rotate: 45,
      style: {
        fill: '#f8fafc',
        stroke: '#0f172a',
        strokeWidth: 1.5,
        opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
      },
      layout: { padding: 2, minimumSize: { default: 14, width: 16, height: 12 } },
    });
    expect((layer.children[0] as IRNode).zIndex).toBe(3);
  });

  it('绘图语义层生成默认 zIndex 作用域且不添加呈现装饰', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
        { type: 'ordinal', name: 'regionColor', domain: ['north', 'south'], range: ['#2563eb', '#dc2626'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'region', scale: 'regionColor' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x', grid: true },
        { type: 'legend', channel: 'color', scale: 'regionColor', title: 'Region' },
      ],
    });
    const root = expandOf(
      spec,
      { sales: SALES.map(row => ({ ...row, region: row.month % 2 === 0 ? 'north' : 'south' })) },
      { ...opts, provenance: true },
    );

    expect(scopeByLayerMeta(root, 'grid').zIndex).toBe(-300);
    expect(scopeByLayerMeta(root, 'mark').zIndex).toBe(0);
    expect(scopeByLayerMeta(root, 'axis').zIndex).toBe(200);
    expect(scopeByLayerMeta(root, 'legend').zIndex).toBe(500);
  });

  it('主题网格使每个现有轴无需本地网格', () => {
    const spec = PlotSchema.parse({
      ...pointSpec(),
      id: 'theme-grid',
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
      defaultPlot: {
        axis: {
          grid: { stroke: '#ffffff', strokeWidth: 1, drawOpacity: 0.15 },
        },
      },
    });
    const root = expandOf(spec, { sales: SALES }, { ...opts, provenance: true });
    const grids = collectScopes(root).filter(scope => scope.meta?.layer === 'grid');

    expect(grids.map(scope => scope.meta?.dimension)).toEqual(['x', 'y']);
    expect(grids.every(scope => (scope.children[0] as IRPath).style?.stroke === '#ffffff')).toBe(true);
    for (const scope of grids) expect((scope.children[0] as IRPath).style?.opacity).toEqual({ stroke: 0.15 });
  });

  it.each([
    [ThemeMode.Light, '#d6e0eb', '#adc2d6', '#5c85ad'],
    [ThemeMode.Dark, '#0a141f', '#14293d', '#29527a'],
  ] as const)('以 %s 模式将 Plot 版式母版投影到表示层中', (mode, area, grid, line) => {
    const spec = PlotSchema.parse({
      ...pointSpec(),
      defaultPlot: {
        typography: { textColor: '#336699' },
        plotArea: { fill: 0.2 },
        axis: {
          line: { stroke: 0.8 },
          grid: { stroke: 0.4 },
          tickLabels: { textColor: 0.8 },
          title: { textColor: 0.6 },
        },
        legend: {
          title: { textColor: 0.8 },
          label: { textColor: 0.6 },
        },
      },
      scales: [
        ...pointSpec().scales,
        { type: 'ordinal', name: 'regionColor', domain: ['north', 'south'], range: ['#f97316', '#2563eb'] },
      ],
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'region', scale: 'regionColor' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x', title: 'Month' },
        { type: 'legend', channel: 'color', scale: 'regionColor', title: 'Region' },
      ],
    });
    const data = SALES.map(row => ({ ...row, region: row.month % 2 === 0 ? 'north' : 'south' }));
    const lowered = expandOf(spec, { sales: data }, { ...opts, provenance: true });
    const background = lowered.children.find(
      child => child.type === 'node' && child.zIndex === PlotLayerZIndex.Background,
    ) as IRNode;
    const gridLayer = scopeByLayerMeta(lowered, 'grid');
    const axisLayer = scopeByLayerMeta(lowered, 'axis');
    const legendLayer = scopeByLayerMeta(lowered, 'legend');
    const markLayer = scopeByLayerMeta(lowered, 'mark');

    expect(background).toMatchObject({
      style: { color: '#336699', fill: 0.2 },
    });
    expect(gridLayer).toMatchObject({
      defaults: { style: { color: '#336699' } },
    });
    expect(axisLayer).toMatchObject({
      defaults: { style: { color: '#336699' } },
    });
    expect(legendLayer).toMatchObject({
      defaults: { style: { color: '#336699' } },
    });
    expect(markLayer.defaults?.style?.color).toBeUndefined();

    const scene = compileToScene(
      { version: 1, type: 'scene', theme: { mode }, children: [spec] },
      { composites: lowerPlots({ sales: data }, opts) },
    ).scene;
    const serialized = JSON.stringify(scene);

    expect(serialized).toContain(area);
    expect(serialized).toContain(grid);
    expect(serialized).toContain(line);
    expect(serialized).not.toMatch(/"(?:fill|stroke)":0(?:\.\d+)?/);
  });

  it('层 zindex 覆盖语义范围而不重用标记节点 zindex', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          layer: { zIndex: 120 },
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { zIndex: 3 },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, { ...opts, provenance: true });

    expect(layer.zIndex).toBe(120);
    expect((layer.children[0] as IRNode).zIndex).toBe(3);
  });

  it('下点应用描边通道每个数据', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
        { type: 'ordinal', name: 'strokeRegion', domain: ['north', 'south'], range: ['#0f172a', '#dc2626'] },
        { type: 'linear', name: 'strokeWeight', domainPadding: 0, domain: [10, 30], range: [1, 3], clamp: true },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          encodings: {
            stroke: { field: 'region', scale: 'strokeRegion' },
            strokeWidth: { field: 'density', scale: 'strokeWeight' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        },
      ],
    });
    const data = [
      { month: 0, revenue: 10, region: 'north', density: 10 },
      { month: 1, revenue: 14, region: 'south', density: 30 },
    ];
    const layer = firstLayer(spec, { sales: data }, opts);

    expect(layer.defaults?.node?.style?.stroke).toBeUndefined();
    expect(layer.defaults?.node?.style?.strokeWidth).toBeUndefined();
    expect(layer.children[0]).toMatchObject({ style: { stroke: '#0f172a', strokeWidth: 1 } });
    expect(layer.children[1]).toMatchObject({ style: { stroke: '#dc2626', strokeWidth: 3 } });
  });

  it('将行编译到场景正常', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [lineSpec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene).toBeTruthy();
    expect(Array.isArray(scene.primitives)).toBe(true);
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('编译点到场景正常', () => {
    // 验证样式上提后 nodeDefault 仍级联出可渲染的散点
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [pointSpec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  // 边界
  it('从数据推断域', () => {
    const layer = firstLayer(pointSpec(), { sales: SALES }, opts);

    // 端点：month 0 -> x 0；month 2 -> x 480
    const xs = layer.children.map(c => ((c as IRNode).position as [number, number])[0]);

    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(480);
  });

  it('下沉单个数据项的点标记', () => {
    const layer = firstLayer(pointSpec(), { sales: [{ month: 1, revenue: 5 }] }, opts);

    expect(layer.children).toHaveLength(1);
  });

  // 错误路径
  it('引用不在数据集中抛出', () => {
    expect(() => expandOf(lineSpec, { other: SALES }, opts)).toThrow(/sales/);
  });

  it('非有限场跳过', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 'oops', revenue: 14 },
      { month: 2, revenue: 9 },
    ];
    const layer = firstLayer(pointSpec(), { sales: rows }, opts);

    expect(layer.children).toHaveLength(2); // 非有限 x 的那行被跳过
  });

  it('非有限尺寸抛出', () => {
    // 非有限的绘图区尺寸会一路污染出 cx="NaN" 坏坐标——入口抛清晰错误而非静默出坏图
    expect(() => expandOf(lineSpec, { sales: SALES }, { layout: { width: Number.NaN, height: 300 } })).toThrow(/width/);
    expect(() =>
      expandOf(lineSpec, { sales: SALES }, { layout: { width: 480, height: Number.POSITIVE_INFINITY } }),
    ).toThrow(/height/);
  });

  it('非正大小抛出', () => {
    expect(() => expandOf(lineSpec, { sales: SALES }, { layout: { width: 0, height: 300 } })).toThrow(/width/);
    expect(() => expandOf(lineSpec, { sales: SALES }, { layout: { width: 480, height: -10 } })).toThrow(/height/);
  });

  // 交互
  it('明确的域范围受尊重', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0, domain: [0, 10], range: [0, 100] },
        { type: 'linear', name: 'yRevenue', domainPadding: 0, domain: [0, 100], range: [100, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
    });
    const layer = firstLayer(spec, { sales: [{ month: 5, revenue: 50 }] }, opts);

    // x: 5/10*100=50; y: 100 + 50/100*(0-100)=50
    expect((layer.children[0] as IRNode).position).toEqual([50, 50]);
  });

  it('顺序字段排序行', () => {
    const shuffled = [
      { month: 2, revenue: 9 },
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const layer = firstLayer(lineSpec, { sales: shuffled }, opts);
    const path = layer.children[0] as IRPath;

    // 首点应是 month 最小 (=0) -> x 0
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [0, 240] });
  });

  // contract：绘图区布局（margin convention）
  const guidedLineSpec: IRPlot = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth', domainPadding: 0 },
      { type: 'linear', name: 'yRevenue', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [
      { type: 'path', encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ],
  });

  it('兼容无引导投影不变', () => {
    // compat: omitting guides keeps the plot area equal to the full frame.
    const path = (firstLayer(lineSpec, { sales: SALES }, opts).children[0] as IRPath).children;

    expect(path).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('将项目标记为绘图区域', () => {
    // 有 x+y 轴 → mark 投影到缩进的 plot area：首点 x>0（左移过 left margin）、末点 x<480（右留白）
    const path = (firstLayer(guidedLineSpec, { sales: SALES }, opts).children[0] as IRPath).children;
    const firstX = (path[0] as { to: [number, number] }).to[0];
    const lastX = (path[path.length - 1] as { to: [number, number] }).to[0];

    expect(firstX).toBeGreaterThan(0);
    expect(lastX).toBeLessThan(480);
    expect(firstX).toBeLessThan(lastX);
  });

  it('绘图区不覆盖显式值域', () => {
    // 显式 range 的 scale 即便有 axis 也不被 plot area 覆盖（尊重用户手设）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0, domain: [0, 10], range: [0, 100] },
        { type: 'linear', name: 'yRevenue', domainPadding: 0, domain: [0, 100], range: [100, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
      defaultPlot: { axis: { grid: false } },
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
    });
    const layer = firstLayer(spec, { sales: [{ month: 5, revenue: 50 }] }, opts);

    expect((layer.children[0] as IRNode).position).toEqual([50, 50]);
  });
});

// contract：interval(bar) mark
const barSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue', domainPadding: 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

describe('lowerPlots 区间/柱（契约）', () => {
  it('条形层矩形节点', () => {
    const layer = firstLayer(barSpec(), { sales: SALES }, opts);

    expect(layer.children).toHaveLength(3);
    expect(layer.defaults?.node?.shape).toBe('rectangle');
    expect(layer.defaults?.node?.layout?.padding).toBe(0);
    expect(layer.defaults?.node?.style?.strokeWidth).toBe(0);
    expect(layer.defaults?.node?.style?.fill).toBe(sharedCategorical[0]);

    // 每个 node 裸（只有 type/position/minimumSize，无 shape）
    expect(layer.children.every(c => (c as IRNode).shape === undefined)).toBe(true);
  });

  it('条形宽度等于带宽', () => {
    const widths = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(n => nodeWidth(n));

    expect(widths.every(w => w > 0)).toBe(true);
    expect(widths[0]).toBeCloseTo(widths[1], 6);
    expect(widths[1]).toBeCloseTo(widths[2], 6);
  });

  it('条形高度反映价值', () => {
    const heights = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(n => nodeHeight(n));

    // revenue 10/14/9 → 第二根最高、第三根最矮
    expect(heights[1]).toBeGreaterThan(heights[0]);
    expect(heights[2]).toBeLessThan(heights[0]);
  });

  it('条位于基线上', () => {
    // 无 guides → plot area 满，baseline y(0)=300：正值柱底 center + height/2 ≈ 300
    for (const node of firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>) {
      const cy = (node.position as [number, number])[1];

      expect(cy + nodeHeight(node) / 2).toBeCloseTo(300, 6);
    }
  });

  it('条形中心均匀上升', () => {
    const xs = (firstLayer(barSpec(), { sales: SALES }, opts).children as Array<IRNode>).map(
      n => (n.position as [number, number])[0],
    );

    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 6);
  });

  it('比例间隔轴使用角色通道作为标签', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'labor' },
      scales: [
        { type: 'linear', name: 'xWidth', domainPadding: 0 },
        { type: 'linear', name: 'yCost', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xWidth', y: 'yCost' },
      marks: [
        {
          type: 'interval',
          encodings: { bounds: { x: { weight: 'gdp' } }, position: { x: { field: 'country' }, y: { field: 'cost' } } },
          properties: { bounds: { x: { kind: 'proportional' } } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const outer = expandOf(
      spec,
      {
        labor: [
          { country: 'Norway', cost: 52, gdp: 3 },
          { country: 'France', cost: 42, gdp: 8 },
          { country: 'Germany', cost: 41, gdp: 10 },
        ],
      },
      opts,
    );
    const xAxis = outer.children[outer.children.length - 1] as IRScope;
    const labels = xAxis.children.filter((child): child is IRNode => (child as IRNode).text !== undefined);

    expect(labels.map(label => label.text)).toEqual(['Norway', 'France', 'Germany']);

    const xs = labels.map(label => (label.position as [number, number])[0]);

    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
  });

  it('跳过了条形缺失值', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 'oops' },
      { month: 2, revenue: 9 },
    ];

    expect(firstLayer(barSpec(), { sales: rows }, opts).children).toHaveLength(2);
  });

  it('bar 编译到场景', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [barSpec()] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('条与点共存', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        { type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
        { type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });

    // 无 guides：两 mark → 两层 mark scope
    const outer = expandOf(spec, { sales: SALES }, opts);

    expect(outer.children).toHaveLength(2);
    expect((outer.children[0] as IRScope).defaults?.node?.shape).toBe('rectangle'); // interval 层
    expect((outer.children[1] as IRScope).defaults?.node?.shape).toBe('circle'); // point 层
  });
});

// contract：ordinal·color scale + color 通道
describe('lowerPlots 颜色（契约）', () => {
  const COUNTRIES = [
    { gdp: 1, life: 70, continent: 'Asia' },
    { gdp: 2, life: 80, continent: 'Europe' },
    { gdp: 3, life: 75, continent: 'Asia' },
  ];
  const coloredPoint = (scales: Array<unknown>): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'c' },
      scales,
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'continent', scale: 'col' },
            position: { x: { field: 'gdp' }, y: { field: 'life' } },
          },
        },
      ],
    });

  it('将颜色组点到子范围中', () => {
    const layer = firstLayer(
      coloredPoint([
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ]),
      { c: COUNTRIES },
      opts,
    );

    // 2 类别 → 2 子 Scope（Asia 先于 Europe，按数据序）
    expect(layer.children).toHaveLength(2);

    const asia = layer.children[0] as IRScope;

    expect(asia.defaults?.node?.shape).toBe('circle');
    expect(asia.defaults?.node?.style?.fill).toBe('#aa');
    expect(asia.children).toHaveLength(2);

    const europe = layer.children[1] as IRScope;

    expect(europe.defaults?.node?.style?.fill).toBe('#bb');
    expect(europe.children).toHaveLength(1);
  });

  it('Point 颜色使用默认配色方案', () => {
    const layer = firstLayer(
      coloredPoint([
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col' },
      ]),
      { c: COUNTRIES },
      opts,
    );

    expect((layer.children[0] as IRScope).defaults?.node?.style?.fill).toBe(sharedCategorical[0]);
    expect((layer.children[1] as IRScope).defaults?.node?.style?.fill).toBe(sharedCategorical[1]);
  });

  it('点色自动合成比例', () => {
    // color 有 field 无 scale ref → 自动合成 ordinal 色 scale（默认配色）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'c' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { color: 'continent', position: { x: { field: 'gdp' }, y: { field: 'life' } } } },
      ],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);

    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRScope).defaults?.node?.style?.fill).toBe(sharedCategorical[0]);
  });

  it('点颜色恒定单副镜', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'c' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'gdp' }, y: { field: 'life' } } },
          properties: { color: '#333' },
        },
      ],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);

    expect(layer.children).toHaveLength(1);
    expect((layer.children[0] as IRScope).defaults?.node?.style?.fill).toBe('#333');
    expect((layer.children[0] as IRScope).children).toHaveLength(3);
  });

  it('颜色引用未知比例尺时抛出错误', () => {
    const spec = coloredPoint([
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ]);

    expect(() => expandOf(spec, { c: COUNTRIES }, opts)).toThrow(/unknown scale/);
  });

  it('颜色非序数标度引用抛出', () => {
    const spec = coloredPoint([
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
      { type: 'linear', name: 'col', domainPadding: 0 },
    ]);

    expect(() => expandOf(spec, { c: COUNTRIES }, opts)).toThrow(/ordinal/);
  });

  it('线颜色常量到描边', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'c' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: { order: 'gdp', position: { x: { field: 'gdp' }, y: { field: 'life' } } },
          properties: { color: 'tomato' },
        },
      ],
    });

    expect(firstLayer(spec, { c: COUNTRIES }, opts).defaults?.path?.style?.stroke).toBe('tomato');
  });

  it('将颜色组划分到子范围中', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'c' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            color: { field: 'continent', scale: 'col' },
            position: { x: { field: 'gdp' }, y: { field: 'life' } },
          },
        },
      ],
    });
    const layer = firstLayer(spec, { c: COUNTRIES }, opts);

    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRScope).defaults?.node?.shape).toBe('rectangle');
  });

  it('无色点保持单一范围', () => {
    // No color channel keeps the mark in one scope with node defaults.
    expect(firstLayer(pointSpec(), { sales: SALES }, opts).defaults?.node?.shape).toBe('circle');
  });
});

describe('lowerPlots 标记绘制', () => {
  it('点常量绘制下沉到节点默认值并编译', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { fill: paintGradient, stroke: paintGradient },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.node?.style?.fill).toEqual(paintGradient);
    expect(layer.defaults?.node?.style?.stroke).toEqual(paintGradient);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: paintGradient }]);
  });

  it('路径常量描边绘制下沉到路径默认值并编译', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'path',
          encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { stroke: paintGradient },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.path?.style?.stroke).toEqual(paintGradient);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: paintGradient }]);
  });

  it('间隔常量绘制下沉到节点默认值并编译', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'interval',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { fill: paintGradient, stroke: paintGradient },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.node?.style?.fill).toEqual(paintGradient);
    expect(layer.defaults?.node?.style?.stroke).toEqual(paintGradient);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: paintGradient }]);
  });

  it('路径闭合常量绘制下沉到路径默认值并编译', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'path',
          encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { closure: { kind: 'baseline' }, fill: paintGradient, stroke: paintGradient },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.path?.style?.fill).toEqual(paintGradient);
    expect(layer.defaults?.path?.style?.stroke).toEqual(paintGradient);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: paintGradient }]);
  });

  it('间隔常量绘制下沉到节点默认值并编译', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domainPadding: 0 },
        { type: 'linear', name: 'yRevenue', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        {
          type: 'interval',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: {
            bounds: { x: { kind: 'full' }, y: { kind: 'span', baseline: 8 } },
            fill: paintGradient,
            stroke: paintGradient,
          },
        },
      ],
    });
    const layer = firstLayer(spec, { sales: SALES }, opts);

    expect(layer.defaults?.node?.style?.fill).toEqual(paintGradient);
    expect(layer.defaults?.node?.style?.stroke).toEqual(paintGradient);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    ).scene;

    expect(scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: paintGradient }]);
  });
});

// contract：relation（series / dodge / stack / 多系列折线）
describe('lowerPlots 关系（契约）', () => {
  const SALES2 = [
    { month: 'Jan', product: 'A', revenue: 3 },
    { month: 'Jan', product: 'B', revenue: 5 },
    { month: 'Feb', product: 'A', revenue: 2 },
    { month: 'Feb', product: 'B', revenue: 4 },
  ];
  const allNodes = (layer: IRScope): Array<IRNode> =>
    layer.children.flatMap(child => (child as IRScope).children as Array<IRNode>);

  it('闪避子带等宽偏移', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'product',
            bounds: { x: { group: 'product' } },
            color: { field: 'product', scale: 'col' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
          properties: { bounds: { x: { kind: 'band' } } },
        },
      ],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);

    // 2 系列 → 2 子 Scope（按颜色），共 4 柱
    expect(layer.children).toHaveLength(2);

    const nodes = allNodes(layer);

    expect(nodes).toHaveLength(4);

    // 所有子带等宽
    const widths = nodes.map(n => nodeWidth(n));

    expect(widths.every(w => Math.abs(w - widths[0]) < 1e-6)).toBe(true);

    // 同类别内 A（系列 0）在 B（系列 1）左侧：A.Jan.x < B.Jan.x
    const seriesA = layer.children[0] as IRScope;
    const seriesB = layer.children[1] as IRScope;
    const aJanX = ((seriesA.children[0] as IRNode).position as [number, number])[0];
    const bJanX = ((seriesB.children[0] as IRNode).position as [number, number])[0];

    expect(aJanX).toBeLessThan(bJanX);
  });

  it('来自变换的堆叠条', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      transform: [{ operation: { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } } }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'product',
            bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
            color: { field: 'product', scale: 'col' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);
    const nodes = allNodes(layer);

    expect(nodes).toHaveLength(4);

    // 全宽柱（堆叠不切子带）：宽度都相等
    const widths = nodes.map(n => nodeWidth(n));

    expect(widths.every(w => Math.abs(w - widths[0]) < 1e-6)).toBe(true);

    // Jan：B（值更高、堆在上）中心像素 < A（y 屏幕向下，越高像素越小）
    const aJan = (layer.children[0] as IRScope).children[0] as IRNode; // 系列 A
    const bJan = (layer.children[1] as IRScope).children[0] as IRNode; // 系列 B

    expect((bJan.position as [number, number])[1]).toBeLessThan((aJan.position as [number, number])[1]);
  });

  it('没有转换抛出的堆叠', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'product',
            bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });

    expect(() => expandOf(spec, { s: SALES2 }, opts)).toThrow(/field.*y0/);
  });

  it('线系列多路径', () => {
    const TREND = [
      { t: 0, v: 1, city: 'X' },
      { t: 1, v: 3, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 4, city: 'Y' },
    ];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col', range: ['#aa', '#bb'] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: {
            series: 'city',
            order: 't',
            color: { field: 'city', scale: 'col' },
            position: { x: { field: 't' }, y: { field: 'v' } },
          },
        },
      ],
    });
    const layer = firstLayer(spec, { t: TREND }, opts);

    // 2 系列 → 2 个 series Scope，各含一条独立颜色的 Path
    expect(layer.children).toHaveLength(2);

    const [seriesX, seriesY] = layer.children as Array<IRScope>;

    expect(seriesX.type).toBe('scope');
    expect((seriesX.children[0] as IRPath).style?.stroke).toBe('#aa');
    expect((seriesY.children[0] as IRPath).style?.stroke).toBe('#bb');
  });

  it('系列省略单条层', () => {
    // 无 series → 退化普通柱（单层 nodeDefault）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
    });
    const layer = firstLayer(spec, { s: SALES2 }, opts);

    expect(layer.defaults?.node?.shape).toBe('rectangle');
  });

  it('堆叠条编译到场景', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      transform: [{ operation: { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } } }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y', domainPadding: 0 },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'product',
            bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
            color: { field: 'product', scale: 'col' },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ s: SALES2 }, opts) },
    ).scene;

    expect(scene.primitives.length).toBeGreaterThan(0);
  });
});
