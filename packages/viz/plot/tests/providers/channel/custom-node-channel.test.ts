import type { IRNode, IRPath, IRScope, IRShapeValue } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { markChannelEncoding, channelField } from '../../../src/contract';
import type { AnyChannelDefinition } from '../../../src/contract';
import { ChannelDefinitionKind, defineNodeChannel, definePathChannel, defineScopeChannel } from '../../../src/contract';
import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot, IRPlotChannel } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * 自定义 `intensity`（→ node.opacity）经 options.definitions.channels 注册，
 * 与内置通道共享 channel registry / delivery
 */

/** 自定义 intensity 通道：score 字段线性映射到 [0.3, 1]，落到 node.opacity */
const intensityChannel = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.3, 1] },
  legend: 'ramp',
  resolve: (ctx, mark) => {
    const binding = markChannelEncoding(mark, 'intensity');
    if (binding === undefined) return undefined;

    const field = channelField(binding);
    const valueOf = (row: Record<string, unknown>): number => Number(row[field]);
    const nums = ctx.rows.map(row => valueOf(row)).filter(Number.isFinite);
    const lo = Math.min(...nums);
    const hi = Math.max(...nums);
    const map = (v: number): number => 0.3 + (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (1 - 0.3);

    return {
      resolver: row => {
        const v = valueOf(row);
        return Number.isFinite(v) ? map(v) : undefined;
      },
      descriptor: {
        channel: 'intensity',
        mapping: {
          domain: [lo, hi],
          range: [0.3, 1],
          map: value => (typeof value === 'number' ? map(value) : undefined),
        },
        scaleType: 'linear',
        domain: [lo, hi],
        range: [0.3, 1],
        field,
        fieldType: ctx.model.find(definition => definition.name === field)?.type,
      },
    };
  },
  deliver: (node, value) => {
    node.style = { ...node.style, opacity: value };
  },
});

/** 自定义 categoryColor 通道：分类值映射为颜色色块并落到 node.fill */
const categoryColorChannel = defineNodeChannel<string>({
  channel: 'categoryColor',
  output: { outputKind: 'color' },
  legend: 'swatch',
  resolve: (ctx, mark) => {
    const binding = markChannelEncoding(mark, 'categoryColor');
    if (binding === undefined) return undefined;

    const field = channelField(binding);
    const domain = [...new Set(ctx.rows.map(row => String(row[field])))];
    const range = ['#dc2626', '#2563eb'];
    const colorByCategory = new Map(domain.map((category, index) => [category, range[index]] as const));

    return {
      resolver: row => colorByCategory.get(String(row[field])),
      descriptor: {
        channel: 'categoryColor',
        scaleType: 'ordinal',
        domain,
        range,
        field,
        fieldType: ctx.model.find(definition => definition.name === field)?.type,
      },
    };
  },
  deliver: (node, value) => {
    node.style = { ...node.style, fill: value };
  },
});

/** 自定义 symbol 通道：只提供形状 descriptor，验证图例缺省颜色的主题色板回退 */
const symbolLegendChannel = defineNodeChannel<IRShapeValue>({
  channel: 'symbolCode',
  output: { outputKind: 'symbol', palette: ['circle', 'diamond'] },
  legend: 'symbol',
  resolve: (ctx, mark) => {
    const binding = markChannelEncoding(mark, 'symbolCode');
    if (binding === undefined) return undefined;

    const field = channelField(binding);
    const domain = [...new Set(ctx.rows.map(row => String(row[field])))];
    const shapes: Array<IRShapeValue> = ['circle', 'diamond'];
    const shapeByCategory = new Map(
      domain.map((category, index) => [category, shapes[index % shapes.length]] as const),
    );

    return {
      resolver: row => shapeByCategory.get(String(row[field])),
      descriptor: {
        channel: 'symbolCode',
        scaleType: 'ordinal',
        domain,
        range: shapes,
        field,
        fieldType: ctx.model.find(definition => definition.name === field)?.type,
      },
    };
  },
  deliver: (node, value) => {
    node.shape = value;
  },
});

const scopeTintChannel = defineScopeChannel<string>({
  channel: 'scopeTint',
  output: { outputKind: 'color' },
  resolve: (ctx, mark) => {
    const binding = markChannelEncoding(mark, 'scopeTint');
    if (binding === undefined) return undefined;
    return { value: String(ctx.rows[0]?.[channelField(binding)]) };
  },
  deliver: (scope, value) => {
    scope.defaults = {
      ...scope.defaults,
      node: { ...scope.defaults?.node, style: { ...scope.defaults?.node?.style, fill: value } },
    };
  },
});

const lineWeightChannel = definePathChannel<number>({
  channel: 'lineWeight',
  output: { outputKind: 'number', range: [1, 6] },
  resolve: (_ctx, mark) => {
    const binding = markChannelEncoding(mark, 'lineWeight');
    if (binding === undefined) return undefined;

    const field = channelField(binding);

    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? value : undefined;
      },
    };
  },
  deliver: (path, value) => {
    path.style = { ...path.style, strokeWidth: value };
  },
});

const opts = (defs?: Array<AnyChannelDefinition>): PlotsLoweringOptions => ({
  layout: { width: 480, height: 300 },
  definitions: { channels: defs },
});

const scatterSpec = (channels?: Record<string, IRPlotChannel>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, ...channels } }],
  });

const nodesOf = (scope: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(scope.children);

  return out;
};

const pathsOf = (scope: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];

  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(child as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };

  walk(scope.children);

  return out;
};

const scopesOf = (scope: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];

  const walk = (node: IRScope): void => {
    out.push(node);

    for (const child of node.children) {
      if ((child as { type?: string }).type === 'scope') walk(child as IRScope);
    }
  };

  walk(scope);

  return out;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => {
  return (lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope)
    .children[0] as IRScope;
};

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

describe('自定义节点通道注册表', () => {
  const rows = [
    { x: 0, y: 0, score: 0 },
    { x: 1, y: 1, score: 5 },
    { x: 2, y: 2, score: 10 },
  ];

  // Happy path：score 0/5/10 → opacity 0.3 / 0.65 / 1.0，落到各 node
  it('自定义强度传递给节点不透明度', () => {
    const spec = scatterSpec({ intensity: 'score' });
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));
    const opacities = nodes.map(n => n.style?.opacity ?? NaN);

    expect(opacities[0]).toBeCloseTo(0.3, 6);
    expect(opacities[1]).toBeCloseTo(0.65, 6);
    expect(opacities[2]).toBeCloseTo(1, 6);
  });

  // 边界：encoding.channels 不绑该键 → 不应用（node 无 custom opacity）
  it('未应用未绑定的自定义通道', () => {
    const spec = scatterSpec();
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));

    expect(nodes.every(n => n.style?.opacity === undefined)).toBe(true);
  });

  // 错误路径：encoding.channels 写了通道名，但没有对应 definition → fail-loud
  it('通道绑定缺少已注册定义时明确报错', () => {
    const spec = scatterSpec({ intensity: 'score' });

    expect(() => firstLayer(spec, { d: rows }, opts())).toThrow(/channel "intensity" is not registered/);
  });

  // 错误路径：自定义通道撞内置名 → fail-loud
  it('与内置通道冲突时明确报错', () => {
    const bad = defineNodeChannel<number>({
      channel: 'size',
      output: { outputKind: 'number', range: [1, 2] },
      resolve: () => undefined,
      deliver: () => {},
    });

    expect(
      () => lowerPlotWithDataArtifact(scatterSpec(), { d: rows }, { ...opts([bad]), textMeasurer: measureLabel }).child,
    ).toThrow(/collides with a built-in channel/);
  });

  // 错误路径：缺 deliver → fail-loud
  it('缺少 deliver 时明确报错', () => {
    const bad = {
      channel: 'glow',
      kind: ChannelDefinitionKind.Node,
      output: { outputKind: 'number' as const, range: [0, 1] as const },
      resolve: () => undefined,
    } as unknown as AnyChannelDefinition;

    expect(
      () => lowerPlotWithDataArtifact(scatterSpec(), { d: rows }, { ...opts([bad]), textMeasurer: measureLabel }).child,
    ).toThrow(/must provide deliver/);
  });

  // 错误路径：两个自定义通道同名 → fail-loud
  it('重复的自定义通道明确报错', () => {
    expect(
      () =>
        lowerPlotWithDataArtifact(
          scatterSpec(),
          { d: rows },
          { ...opts([intensityChannel, intensityChannel]), textMeasurer: measureLabel },
        ).child,
    ).toThrow(/duplicate custom channel/);
  });

  // 交互：自定义通道 + 内置 size 同图各自生效（size→radius、intensity→opacity）
  it('自定义通道与内置大小共存', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { size: 'score', intensity: 'score', position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    });
    const nodes = nodesOf(firstLayer(spec, { d: rows }, opts([intensityChannel])));

    expect(nodes.every(n => n.style?.opacity !== undefined)).toBe(true);
    expect(nodes.some(n => n.layout?.minimumSize !== undefined)).toBe(true);
  });

  it('自定义范围通道默认传递到层节点', () => {
    const spec = scatterSpec({ scopeTint: 'tint' });
    const layer = firstLayer(spec, { d: rows.map(row => ({ ...row, tint: '#f66' })) }, opts([scopeTintChannel]));

    expect(layer.defaults?.node?.style?.fill).toBe('#f66');
  });

  it('自定义路径通道传递至 Path 描边宽度', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'path', encodings: { lineWeight: 'weight', position: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
    });
    const layer = firstLayer(
      spec,
      {
        d: [
          { x: 0, y: 0, weight: 3 },
          { x: 1, y: 1, weight: 3 },
        ],
      },
      opts([lineWeightChannel]),
    );

    expect(pathsOf(layer)[0]?.style?.strokeWidth).toBe(3);
  });

  // 交互：自定义 node 通道也可被 legend guide 引用；schema 不再把 channel 限死在内置 color/size/opacity/shape
  it('自定义通道图例从注册表描述符中下沉', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { intensity: 'score', position: { x: { field: 'x' }, y: { field: 'y' } } } }],
      guides: [{ type: 'legend', channel: 'intensity' }],
    });
    const root = expandOf(spec, { d: rows }, opts([intensityChannel]));
    const legend = scopesOf(root).find(scope => scope.id === 'legend.intensity');

    expect(legend).toBeDefined();

    const ramp = legend
      ? nodesOf(legend).find(
          node =>
            typeof node.style?.fill === 'object' &&
            'kind' in node.style.fill &&
            node.style.fill.kind === 'linearGradient',
        )
      : undefined;

    expect(ramp).toBeDefined();
  });

  it('自定义颜色通道样本使用描述符颜色', () => {
    const colorRows = [
      { x: 0, y: 0, tone: 'warm' },
      { x: 1, y: 1, tone: 'cool' },
    ];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { categoryColor: 'tone', position: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
      guides: [{ type: 'legend', channel: 'categoryColor' }],
    });
    const root = expandOf(spec, { d: colorRows }, opts([categoryColorChannel]));
    const legend = scopesOf(root).find(scope => scope.id === 'legend.categoryColor');

    expect(legend).toBeDefined();

    const fills = legend
      ? nodesOf(legend)
          .filter(node => node.text === undefined)
          .map(node => node.style?.fill)
      : [];

    expect(fills).toEqual(['#dc2626', '#2563eb']);
  });

  it('没有默认颜色的符号图例使用第一个系列颜色', () => {
    const symbolRows = [
      { x: 0, y: 0, kind: 'A' },
      { x: 1, y: 1, kind: 'B' },
    ];
    const spec = PlotSchema.parse({
      ...scatterSpec({ symbolCode: 'kind' }),
      guides: [{ type: 'legend', channel: 'symbolCode' }],
    });
    const root = expandOf(spec, { d: symbolRows }, opts([symbolLegendChannel]));
    const legend = scopesOf(root).find(scope => scope.id === 'legend.symbolCode');
    const mark = scopesOf(root).find(scope => scope.defaults?.node?.shape === 'circle');
    const fills = legend
      ? nodesOf(legend)
          .filter(node => node.text === undefined)
          .map(node => node.style?.fill)
      : [];

    expect(mark?.defaults?.node?.style?.fill).toBeDefined();
    expect(fills).toEqual([mark?.defaults?.node?.style?.fill, mark?.defaults?.node?.style?.fill]);
  });

  it('自定义通道图例拒绝不兼容输出类型', () => {
    const invalidChannel = defineNodeChannel<number>({
      channel: 'invalidSymbol',
      output: { outputKind: 'number', range: [1, 2] },
      legend: 'symbol',
      resolve: (ctx, mark) => {
        const binding = markChannelEncoding(mark, 'invalidSymbol');
        if (binding === undefined) return undefined;

        const field = channelField(binding);

        return {
          resolver: row => Number(row[field]),
          descriptor: {
            channel: 'invalidSymbol',
            scaleType: 'linear',
            domain: [0, 1],
            range: [1, 2],
            field,
            fieldType: ctx.model.find(definition => definition.name === field)?.type,
          },
        };
      },
      deliver: (node, value) => {
        node.layout = { ...node.layout, minimumSize: value };
      },
    });
    const spec = PlotSchema.parse({
      ...scatterSpec({ invalidSymbol: 'score' }),
      guides: [{ type: 'legend', channel: 'invalidSymbol' }],
    });

    expect(() => expandOf(spec, { d: rows }, opts([invalidChannel]))).toThrow(
      /legend form "symbol" requires outputKind "symbol"/,
    );
  });

  // JSON round-trip：encoding.channels 进 IR 不丢
  it('编码通道保持 JSON 往返等价', () => {
    const spec = scatterSpec({ intensity: 'score' });
    const back = PlotSchema.parse(JSON.parse(JSON.stringify(spec)));
    const mark = back.marks[0];

    expect(mark.encodings?.intensity).toEqual('score');
  });
});
