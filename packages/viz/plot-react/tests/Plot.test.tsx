import type { ExternalDatasets, ExternalRow, IRDataModel } from '@retikz/data';
import type { IRPlot, PlotLineageRun } from '@retikz/plot';

import { lowerPlots } from '@retikz/plot';
import { Layout } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as plotReact from '../src';
import {
  IntervalMark,
  PathMark,
  Plot,
  PlotAxis,
  PointMark,
  resolvePlotAuthoring,
  resolvePlotLineage,
  RetikzPlotReactErrorCode,
} from '../src';

type InputEmbeddablePlotComponent = {
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => { spec: IRPlot };
};

const spec: IRPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    { type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
    { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
  ],
};

const data: ExternalDatasets = {
  sales: [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ],
};

const plotThemeTokens = {
  'plot.area.fill': '#123456',
} satisfies NonNullable<IRPlot['plotThemeTokens']>;

const revenue = [
  { quarter: 'Q1', value: 18 },
  { quarter: 'Q2', value: 24 },
  { quarter: 'Q3', value: 15 },
  { quarter: 'Q4', value: 30 },
];

/** 抽出 SVG 里所有点 glyph（circle 节点渲染为 ellipse）的 cx,cy 与 path 的 d（与资源 id 无关，作几何等价比较） */
const geometry = (svg: string) => {
  const glyphs = (svg.match(/<ellipse[^>]*>/g) ?? [])
    .map(c => {
      const m = /cx="([^"]+)"\s+cy="([^"]+)"/.exec(c);
      return m ? `${m[1]},${m[2]}` : c;
    })
    .sort();
  const paths = (svg.match(/\sd="[^"]+"/g) ?? []).sort();
  return { glyphs, paths };
};

describe('<Plot spec data> 薄包装', () => {
  it.each(['className', 'style', 'renderer', 'themeStyles', 'lineage', 'hostLineageMetadata', 'onLineage'])(
    '拒绝 embedded Plot 自有的 standalone prop %s，包括显式 undefined',
    standaloneProp => {
      expect(() =>
        (Plot as unknown as InputEmbeddablePlotComponent).createInputEmbedProps({
          spec,
          data,
          [standaloneProp]: undefined,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: 'RetikzPlotReactError',
          code: RetikzPlotReactErrorCode.Default,
          message: expect.stringMatching(/embedded Plot.*standalone.*outer.*Layout/i),
        }),
      );
    },
  );

  it('用一个 SVG host 渲染 standalone/anonymous embedded Plot，并继承外层 Theme mode', () => {
    const standalone = renderToStaticMarkup(
      <Plot spec={spec} data={data} className="plot-host" style={{ maxWidth: 480 }} themeStyles={[]} />,
    );
    const embedded = renderToStaticMarkup(
      <Layout theme={{ mode: 'dark' }}>
        <Plot spec={spec} data={data} />
      </Layout>,
    );

    expect(standalone.match(/<svg/g)).toHaveLength(1);
    expect(standalone).toContain('class="plot-host"');
    expect(embedded.match(/<svg/g)).toHaveLength(1);
    expect(embedded).not.toContain('data-retikz-id');
    expect(embedded).toContain('hsl(210, 50%, 60%)');
    expect(embedded).not.toContain('hsl(210, 38%, 48%)');
  });

  it('嵌入 Plot 向 Vanilla adapter 交付显式 direct IR source', () => {
    const input = (Plot as unknown as InputEmbeddablePlotComponent).createInputEmbedProps({ spec, data });

    expect(input.spec).toBe(spec);
    expect(input.spec).toMatchObject({ namespace: 'plot', type: 'plot' });
  });

  it('resolvePlotAuthoring 保留无覆盖 spec 的 IR 身份且不返回 Input', () => {
    const runtime = resolvePlotAuthoring({ spec, data });

    expect(runtime.spec).toBe(spec);
    expect('input' in runtime).toBe(false);
  });

  it('resolvePlotAuthoring 保留 DSL mark 的 runtime label sidecar 并保持 Plot IR 可序列化', () => {
    const pointResolveLabel = (row: ExternalRow): string => String(row.label);
    const intervalResolveLabel = (row: ExternalRow): string => String(row.label);
    const runtime = resolvePlotAuthoring({
      data: [{ month: 'Jan', revenue: 10, label: 'January' }],
      children: (
        <>
          <PointMark id="points" x="month" y="revenue" resolveLabel={pointResolveLabel} />
          <IntervalMark id="bars" x="month" y="revenue" resolveLabel={intervalResolveLabel} />
        </>
      ),
    });

    expect(runtime.lowerOptions.resolveLabel?.points).toBe(pointResolveLabel);
    expect(runtime.lowerOptions.resolveLabel?.bars).toBe(intervalResolveLabel);
    const serialized = JSON.stringify(runtime.spec);
    expect(serialized).not.toContain('resolveLabel');
    expect(serialized).not.toContain('function');
    expect(serialized).toContain('"marks"');
  });

  it('不再公开 Plot presentation label authoring', () => {
    expect('TitleLabel' in plotReact).toBe(false);
    expect('CaptionLabel' in plotReact).toBe(false);
    expect('FieldName' in plotReact).toBe(false);
    expect('ExtensionChannelProp' in plotReact).toBe(false);
    expect('ScaleDimension' in plotReact).toBe(false);
    expect('PositionScaleType' in plotReact).toBe(false);
    expect('FacetDimensionInput' in plotReact).toBe(false);
  });

  it('渲染出含 path（折线）与 circle（散点）的 SVG', () => {
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} />);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });

  it('省略 width/height 时仍渲染（Layout 自动布局）', () => {
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} />);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<ellipse');
  });

  it('standalone Plot 的 local token override 生效', () => {
    const svg = renderToStaticMarkup(
      <Plot spec={spec} data={data} plotThemeTokens={plotThemeTokens} width={480} height={300} />,
    );

    expect(svg).toContain('fill="#123456"');
  });

  it('spec 与 DSL 入口都透传 PlotAxis theme token rules', () => {
    const plotThemeTokenRules: NonNullable<IRPlot['plotThemeTokenRules']> = [
      {
        select: { dimension: 'x' },
        tokens: {
          'axis.grid.enabled': true,
          'axis.grid.stroke': '#ff00ff',
          'axis.grid.includeDomain': true,
        },
      },
    ];
    const specSvg = renderToStaticMarkup(
      <Plot
        spec={{ ...spec, guides: [{ type: 'axis', dimension: 'x' }] }}
        data={data}
        plotThemeTokenRules={plotThemeTokenRules}
        width={480}
        height={300}
      />,
    );
    const dslSvg = renderToStaticMarkup(
      <Plot data={revenue} plotThemeTokenRules={plotThemeTokenRules} width={480} height={300}>
        <PointMark x="quarter" y="value" />
        <PlotAxis dimension="x" />
      </Plot>,
    );

    expect(specSvg).toContain('stroke="#ff00ff"');
    expect(dslSvg).toContain('stroke="#ff00ff"');
  });

  it('embedded Plot 的 local token override 只作用于该 Plot', () => {
    const svg = renderToStaticMarkup(
      <Layout width={960} height={300}>
        <Plot spec={spec} data={data} plotThemeTokens={plotThemeTokens} width={480} height={300} />
        <Plot spec={spec} data={data} x={480} width={480} height={300} />
      </Layout>,
    );

    expect(svg.match(/fill="#123456"/g)).toHaveLength(1);
  });

  it('data 缺 spec 引用的数据集 → 渲染期抛错', () => {
    expect(() => renderToStaticMarkup(<Plot spec={spec} data={{}} width={480} height={300} />)).toThrow();
  });

  it('几何与手写 <Layout ir composites> 一致（证明薄包装不引入额外语义）', () => {
    const viaPlot = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} />);
    const viaLayout = renderToStaticMarkup(
      <Layout
        ir={{ version: 1, type: 'scene', children: [spec] }}
        composites={lowerPlots(data, { width: 480, height: 300 })}
        width={480}
        height={300}
      />,
    );
    expect(geometry(viaPlot)).toEqual(geometry(viaLayout));
  });

  it('可以作为可嵌入 Tier 2 子组件放进同一个 <Layout>', () => {
    const svg = renderToStaticMarkup(
      <Layout width={580} height={260}>
        <Plot id="cartesianPanel" data={revenue} width={300} height={220} x={0} y={20}>
          <IntervalMark x="quarter" y="value" color="quarter" />
          <PlotAxis dimension="x" />
          <PlotAxis dimension="y" grid />
        </Plot>
        <Plot id="polarPanel" data={revenue} width={260} height={260} coordinate="polar2D" x={320} y={0}>
          <IntervalMark x="quarter" y="value" color="quarter" />
          <PlotAxis dimension="x" />
          <PlotAxis dimension="y" grid />
        </Plot>
      </Layout>,
    );

    expect(svg).toContain('<svg');
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toContain('<path');
    expect(svg).toContain('<rect');
    expect(svg).toContain('transform="translate(320 0)"');
    expect(svg).toContain('cartesianPanel');
    expect(svg).toContain('polarPanel.plotArea');
  });

  it('单独渲染时也承接面板 transforms', () => {
    const svg = renderToStaticMarkup(
      <Plot data={revenue} width={300} height={220} transforms={[{ kind: 'translate', x: 10, y: 20 }]}>
        <IntervalMark x="quarter" y="value" color="quarter" />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>,
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('transform="translate(10 20)"');
  });

  it('DSL 入口透传 mark transform shortcut 生成的普通 transform', () => {
    const svg = renderToStaticMarkup(
      <Plot
        data={[
          { x: 0, value: 2 },
          { x: 1, value: 3 },
        ]}
        width={300}
        height={220}
        markTransformShortcuts={[
          {
            markType: 'point',
            build: () => [{ kind: 'normalize', field: 'value', as: 'share' }],
          },
        ]}
      >
        <PointMark x="x" y="share" />
      </Plot>,
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('<ellipse');
  });

  it('resolvePlotLineage 复用 <Plot> props 并按配置返回运行时图元链路', () => {
    const lineage = resolvePlotLineage({
      spec,
      data,
      width: 480,
      height: 300,
      lineage: {
        scaleMappings: true,
        layoutContext: true,
        rowValues: { maxRows: 1, fields: ['revenue'] },
        hostMetadata: { query: true },
      },
      hostLineageMetadata: { queryId: 'q-sales', datasetVersion: 'v1' },
    });

    expect(lineage).toMatchObject<Partial<PlotLineageRun>>({
      dataReference: 'sales',
      hostMetadata: { queryId: 'q-sales', datasetVersion: 'v1' },
    });
    expect(lineage?.marks[0]?.encoding).toContainEqual({ channel: 'x', field: 'month' });
    expect(lineage?.marks[0]?.rowValues).toEqual([{ revenue: 10 }]);
    expect(lineage?.scales?.map(scale => scale.name)).toEqual(['x', 'y']);
    expect(lineage?.scales?.find(scale => scale.name === 'x')?.channels).toContainEqual({
      markIndex: 0,
      channel: 'x',
      field: 'month',
    });
    expect(lineage?.layout).toMatchObject({ coordinateType: 'cartesian2D', hasComposition: false });
  });

  it('lineage=false 时 React 链路解析保持关闭', () => {
    const lineage = resolvePlotLineage({ spec, data, width: 480, height: 300, lineage: false });
    expect(lineage).toBeUndefined();
  });

  it('嵌入态默认使用 id 作为 DSL 数据集引用，显式 dataRef 可共享数据源', () => {
    const svg = renderToStaticMarkup(
      <Layout width={580} height={260}>
        <Plot id="leftPanel" dataRef="shared" data={revenue} width={300} height={220} x={0} y={20}>
          <IntervalMark x="quarter" y="value" />
          <PlotAxis dimension="x" />
        </Plot>
        <Plot id="rightPanel" dataRef="shared" data={revenue} width={260} height={220} x={320} y={20}>
          <PathMark x="quarter" y="value" order="quarter" />
          <PlotAxis dimension="x" />
        </Plot>
      </Layout>,
    );

    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg).toContain('leftPanel.plotArea');
    expect(svg).toContain('rightPanel.plotArea');
  });

  it('同一 Layout 的多个 Plot 按数据集 reference 合并 fieldMap', () => {
    const model: IRDataModel = [
      { name: 'month', type: 'categorical' },
      { name: 'revenue', type: 'continuous' },
    ];
    const mappedRows = [
      { period: 'Jan', amount: 10 },
      { period: 'Feb', amount: 20 },
    ];
    const directRows = [
      { month: 'Jan', revenue: 12 },
      { month: 'Feb', revenue: 18 },
    ];

    const svg = renderToStaticMarkup(
      <Layout width={580} height={260}>
        <Plot
          id="mappedPanel"
          data={mappedRows}
          model={model}
          fieldMap={{ month: 'period', revenue: 'amount' }}
          width={280}
          height={220}
        >
          <PointMark x="month" y="revenue" />
        </Plot>
        <Plot id="directPanel" data={directRows} model={model} width={280} height={220} x={300}>
          <PointMark x="month" y="revenue" />
        </Plot>
      </Layout>,
    );

    expect(svg.match(/<ellipse/g)).toHaveLength(4);
  });
});
