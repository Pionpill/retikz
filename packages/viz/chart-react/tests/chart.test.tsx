import type { IRChartSource } from '@retikz/chart';
import { normalizeBubbleChart } from '@retikz/chart-vanilla/point';
import { normalizeConnectedScatterChart } from '@retikz/chart-vanilla/point';
import { normalizeRangedDotChart } from '@retikz/chart-vanilla/point';
import { normalizeRegressionChart } from '@retikz/chart-vanilla/point';
import { normalizeScatterChart } from '@retikz/chart-vanilla/point';
import { normalizeStripChart } from '@retikz/chart-vanilla/point';
import { ScatterChartSchema } from '@retikz/chart/point';
import { PlotAxis, PlotFacet, PlotTransform, PointMark } from '@retikz/plot-react';
import { Layout, Text } from '@retikz/react';
import type { SynchronousInputEmbedAdapter } from '@retikz/vanilla';
import { normalizeScene, scene } from '@retikz/vanilla';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ChartCoordinate,
  ChartData,
  ChartExtension,
  ChartLayout,
  ChartNote,
  ChartSource,
  ChartSubtitle,
  ChartTitle,
  RetikzChartReactErrorCode,
} from '../src';
import { BubbleChart, BubbleEncodings, BubbleMark, BubbleProperties } from '../src/point/bubble';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterMark,
  ConnectedScatterProperties,
} from '../src/point/connected-scatter';
import { RangedDotChart, RangedDotEncodings, RangedDotMark, RangedDotProperties } from '../src/point/ranged-dot';
import { RegressionChart, RegressionEncodings, RegressionMark, RegressionProperties } from '../src/point/regression';
import { ScatterChart, ScatterEncodings, ScatterMark, ScatterProperties } from '../src/point/scatter';
import { StripChart, StripEncodings, StripMark, StripProperties } from '../src/point/strip';

type InputComponent<TInput> = {
  inputEmbedAdapter: SynchronousInputEmbedAdapter<TInput>;
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

/** 通过正式场景归一化观察 React 编写结果 */
const inputFromProps = <TInput,>(component: InputComponent<TInput>, props: Readonly<Record<string, unknown>>) => {
  const input = component.createInputEmbedProps(props);
  const normalized = normalizeScene(
    scene({ children: [{ type: 'embed', kind: component.inputEmbedAdapter.kind, props: input }] }),
    { adapters: [component.inputEmbedAdapter] },
  );

  return { source: normalized.ir.children[0] as IRChartSource, input };
};

const inputOf = <TInput,>(component: InputComponent<TInput>, children: ReactNode) =>
  inputFromProps(component, { children });

const requiredDeclarations = (
  <>
    <ChartData data={[{ x: 1, y: 2 }]} />
    <ScatterEncodings x="x" y="y" />
  </>
);

const requiredBubbleDeclarations = (
  <>
    <ChartData data={[{ income: 1000, lifeExpectancy: 60, population: 1_000_000 }]} />
    <BubbleEncodings x="income" y="lifeExpectancy" size="population" />
  </>
);

const requiredRegressionDeclarations = (
  <>
    <ChartData
      data={[
        { x: 1, y: 2, species: 'setosa' },
        { x: 2, y: 4, species: 'setosa' },
        { x: 1, y: 3, species: 'versicolor' },
        { x: 2, y: 5, species: 'versicolor' },
      ]}
    />
    <RegressionEncodings x="x" y="y" series="species" />
  </>
);

const requiredStripDeclarations = (
  <>
    <ChartData
      data={[
        { category: 'A', value: 2 },
        { category: 'A', value: 3 },
        { category: 'B', value: 4 },
      ]}
    />
    <StripEncodings
      x={{ field: 'category', scale: { operation: { type: 'point', name: 'category' } } }}
      y={{ field: 'value', scale: { operation: { type: 'linear', name: 'value' } } }}
    />
  </>
);

const coordinateRootPropCases = [
  {
    name: 'BubbleChart',
    createInput: () => inputFromProps(BubbleChart, { coordinate: 'polar2D', children: requiredBubbleDeclarations }),
  },
  {
    name: 'ConnectedScatterChart',
    createInput: () =>
      inputFromProps(ConnectedScatterChart, {
        coordinate: 'polar2D',
        children: (
          <>
            <ChartData data={[{ x: 1, y: 2, order: 1 }]} />
            <ConnectedScatterEncodings x="x" y="y" order="order" />
          </>
        ),
      }),
  },
  {
    name: 'RangedDotChart',
    createInput: () =>
      inputFromProps(RangedDotChart, {
        coordinate: 'polar2D',
        children: (
          <>
            <ChartData data={[{ category: 'A', start: 1, end: 2 }]} />
            <RangedDotEncodings category="category" start="start" end="end" />
          </>
        ),
      }),
  },
  {
    name: 'RegressionChart',
    createInput: () =>
      inputFromProps(RegressionChart, { coordinate: 'polar2D', children: requiredRegressionDeclarations }),
  },
  {
    name: 'ScatterChart',
    createInput: () => inputFromProps(ScatterChart, { coordinate: 'polar2D', children: requiredDeclarations }),
  },
  {
    name: 'StripChart',
    createInput: () => inputFromProps(StripChart, { coordinate: 'polar2D', children: requiredStripDeclarations }),
  },
] as const;

describe('类型化点 Chart React 声明', () => {
  it.each([
    {
      name: 'ScatterChart',
      chartType: 'scatter',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'scatter.rows' },
          recipe: { encodings: { x: 'x', y: 'y' } },
        }),
    },
    {
      name: 'BubbleChart',
      chartType: 'bubble',
      createInput: () =>
        inputFromProps(BubbleChart, {
          rows: [{ x: 1, y: 2, size: 3 }],
          data: { reference: 'bubble.rows' },
          recipe: { encodings: { x: 'x', y: 'y', size: 'size' } },
        }),
    },
    {
      name: 'ConnectedScatterChart',
      chartType: 'connected-scatter',
      createInput: () =>
        inputFromProps(ConnectedScatterChart, {
          rows: [{ x: 1, y: 2, order: 3 }],
          data: { reference: 'connected.rows' },
          recipe: { encodings: { x: 'x', y: 'y', order: 'order' } },
        }),
    },
    {
      name: 'RegressionChart',
      chartType: 'regression',
      createInput: () =>
        inputFromProps(RegressionChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'regression.rows' },
          recipe: { encodings: { x: 'x', y: 'y' } },
        }),
    },
    {
      name: 'RangedDotChart',
      chartType: 'ranged-dot',
      createInput: () =>
        inputFromProps(RangedDotChart, {
          rows: [{ category: 'A', start: 1, end: 2 }],
          data: { reference: 'ranged.rows' },
          recipe: { encodings: { category: 'category', start: 'start', end: 'end' } },
        }),
    },
    {
      name: 'StripChart',
      chartType: 'strip',
      createInput: () =>
        inputFromProps(StripChart, {
          rows: [{ category: 'A', value: 2 }],
          data: { reference: 'strip.rows' },
          recipe: {
            encodings: {
              x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
              y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
            },
          },
        }),
    },
  ])('支持 $name 的类似 IR 的 root 权限编写', ({ chartType, createInput }) => {
    const input = createInput();

    expect(input.source).toMatchObject({
      namespace: 'chart',
      type: 'point',
      recipe: { chartType },
    });
  });

  it('通过现有的 Vanilla 输入映射每个结构化根槽', () => {
    const rows = [{ x: 1, y: 2 }];
    const root = inputFromProps(ScatterChart, {
      rows,
      data: { reference: 'root.rows', model: [{ name: 'x' }, { name: 'y' }] },
      layout: { width: 640, height: 360 },
      coordinate: { type: 'polar2D', innerRadius: 0 },
      presentation: { title: 'Root title', note: 'Root note' },
      recipe: {
        encodings: { x: 'x', y: 'y' },
        properties: { opacity: 0 },
        marks: [{ kind: 'scatter', properties: { opacity: 0 } }],
      },
      plotExtension: { guides: [] },
    });
    const vanilla = normalizeScatterChart({
      data: { reference: 'root.rows', model: [{ name: 'x' }, { name: 'y' }] },
      layout: { width: 640, height: 360 },
      coordinate: { type: 'polar2D', innerRadius: 0 },
      title: 'Root title',
      note: 'Root note',
      encodings: { x: 'x', y: 'y' },
      properties: { opacity: 0 },
      marks: [{ kind: 'scatter', properties: { opacity: 0 } }],
      plotExtension: { guides: [] },
    });

    expect(root.source).toEqual(vanilla);
    expect(root.input.data).toBe(rows);
  });

  it('保留稀疏点配方辅助线控制并匹配 Vanilla 标准化', () => {
    const scatter = inputFromProps(ScatterChart, {
      rows: [{ x: 1, y: 2, size: 3 }],
      data: { reference: 'guide.scatter' },
      recipe: {
        encodings: { x: 'x', y: 'y', size: 'size' },
        guides: { axis: false, grid: false, legend: false },
      },
    });
    const vanillaScatter = normalizeScatterChart({
      data: { reference: 'guide.scatter' },
      encodings: { x: 'x', y: 'y', size: 'size' },
      guides: { axis: false, grid: false, legend: false },
    });
    const strip = inputFromProps(StripChart, {
      rows: [{ category: 'A', value: 2 }],
      data: { reference: 'guide.strip' },
      recipe: {
        encodings: {
          x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
          y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
        },
        guides: { grid: false },
      },
    });
    const vanillaStrip = normalizeStripChart({
      data: { reference: 'guide.strip' },
      encodings: {
        x: { field: 'category', scale: { operation: { type: 'point', name: 'category' } } },
        y: { field: 'value', scale: { operation: { type: 'linear', name: 'value' } } },
      },
      guides: { grid: false },
    });

    expect(scatter.source).toEqual(vanillaScatter);
    expect(scatter.source.recipe.guides).toEqual({ axis: false, grid: false, legend: false });
    expect(strip.source).toEqual(vanillaStrip);
    expect(strip.source.recipe.guides).toEqual({ grid: false });
  });

  it('保持仅声明编写与结构化根编写相同', () => {
    const rows = [{ x: 1, y: 2 }];
    const root = inputFromProps(ScatterChart, {
      rows,
      data: { reference: 'parity.rows' },
      layout: { width: 320, height: 180 },
      presentation: { title: 'Parity' },
      recipe: {
        encodings: { x: 'x', y: 'y' },
        properties: { opacity: 0.5, autoPadding: { kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } } },
      },
    });
    const declarations = inputOf(
      ScatterChart,
      <>
        <ChartData data={rows} reference="parity.rows" />
        <ChartLayout layout={{ width: 320, height: 180 }} />
        <ChartTitle>Parity</ChartTitle>
        <ScatterEncodings x="x" y="y" />
        <ScatterProperties
          opacity={0.5}
          autoPadding={{ kind: 'point-aware', clearance: { default: 8, top: 20, left: 0 } }}
        />
      </>,
    );

    expect(root.source).toEqual(declarations.source);
    expect(root.input.data).toEqual(declarations.input.data);
  });

  it('允许根声明和无头声明在所属模块槽之间混合', () => {
    const input = inputFromProps(ScatterChart, {
      rows: [{ x: 1, y: 2 }],
      data: { reference: 'hybrid.rows' },
      presentation: { subtitle: 'Root subtitle' },
      recipe: { encodings: { x: 'x', y: 'y' } },
      children: (
        <>
          <ChartTitle>Child title</ChartTitle>
          <ScatterProperties opacity={0.25} />
        </>
      ),
    });

    expect(input.source.presentation).toEqual({ title: { text: 'Child title' }, subtitle: { text: 'Root subtitle' } });
    expect(input.source.recipe).toMatchObject({
      encodings: { x: 'x', y: 'y' },
      properties: { opacity: 0.25 },
    });
  });

  it.each([
    {
      name: 'data',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          recipe: { encodings: { x: 'x', y: 'y' } },
          children: <ChartData data={[{ x: 2, y: 3 }]} />,
        }),
    },
    {
      name: 'layout',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          layout: { width: 320 },
          recipe: { encodings: { x: 'x', y: 'y' } },
          children: <ChartLayout layout={{ height: 180 }} />,
        }),
    },
    {
      name: 'coordinate',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          coordinate: 'polar2D',
          recipe: { encodings: { x: 'x', y: 'y' } },
          children: <ChartCoordinate coordinate="cartesian2D" />,
        }),
    },
    {
      name: 'plotExtension',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          recipe: { encodings: { x: 'x', y: 'y' } },
          plotExtension: { guides: [] },
          children: <ChartExtension />,
        }),
    },
    {
      name: 'recipe.encodings',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          recipe: { encodings: { x: 'x', y: 'y' } },
          children: <ScatterEncodings x="otherX" y="otherY" />,
        }),
    },
    {
      name: 'recipe.properties',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          recipe: { encodings: { x: 'x', y: 'y' }, properties: { opacity: 0 } },
          children: <ScatterProperties opacity={0.5} />,
        }),
    },
    {
      name: 'recipe.marks',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          recipe: { encodings: { x: 'x', y: 'y' }, marks: [] },
          children: <ScatterMark />,
        }),
    },
    {
      name: 'presentation.title',
      createInput: () =>
        inputFromProps(ScatterChart, {
          rows: [{ x: 1, y: 2 }],
          data: { reference: 'root.rows' },
          presentation: { title: 'Root title' },
          recipe: { encodings: { x: 'x', y: 'y' } },
          children: <ChartTitle>Child title</ChartTitle>,
        }),
    },
  ])('拒绝同一 $name 槽的根和声明源', ({ name, createInput }) => {
    expect(createInput).toThrow(new RegExp(`${name}.*both`, 'iu'));
  });

  it('报告 React 边界处缺少的运行时行和配方编码', () => {
    expect(() =>
      inputFromProps(ScatterChart, {
        data: { reference: 'missing.rows' },
        recipe: { encodings: { x: 'x', y: 'y' } },
      }),
    ).toThrow(/runtime rows.*required/iu);
    expect(() =>
      inputFromProps(ScatterChart, {
        rows: [],
        data: { reference: 'empty.rows' },
      }),
    ).toThrow(/recipe.*encodings.*required/iu);
  });

  it('保留结构化根配方槽中编写的零、假和空数组', () => {
    const connected = inputFromProps(ConnectedScatterChart, {
      rows: [{ x: 1, y: 2, order: 1 }],
      data: { reference: 'falsy.rows' },
      recipe: {
        encodings: { x: 'x', y: 'y', order: 'order' },
        properties: { path: { connectNulls: false }, point: { opacity: 0 } },
        marks: [],
      },
      plotExtension: { guides: [] },
    });

    expect(connected.source.recipe.properties).toMatchObject({
      path: { connectNulls: false },
      point: { opacity: 0 },
    });
    expect(connected.source.recipe.marks).toEqual([]);
    expect(connected.source.plotExtension?.guides).toEqual([]);
  });

  it('使用独立宿主的根布局尺寸，并在嵌入时仅保留它们 Source', () => {
    const rootProps = {
      rows: [{ x: 1, y: 2 }],
      data: { reference: 'layout.rows' },
      layout: { width: 640, height: 360 },
      recipe: { encodings: { x: 'x', y: 'y' } },
      children: null,
    };
    const standalone = renderToStaticMarkup(<ScatterChart {...rootProps} />);
    const embeddedInput = inputFromProps(ScatterChart, rootProps);

    expect(standalone).toMatch(/^<svg[^>]*width="640" height="360"/);
    expect(embeddedInput.source.layout).toEqual({ width: 640, height: 360 });
  });

  it.each(coordinateRootPropCases)(
    '通过 Vanilla 标准化映射 $name 坐标根 props',
    ({ createInput }) => {
      expect(createInput().source.coordinate).toEqual({
        type: 'polar2D',
      });
    },
  );

  it('保留具体 Chart 根 prop 中配置的坐标对象', () => {
    const input = inputFromProps(ScatterChart, {
      coordinate: { type: 'polar2D', innerRadius: 0, startAngle: -90 },
      children: requiredDeclarations,
    });

    expect(input.source.coordinate).toEqual({
      type: 'polar2D',
      innerRadius: 0,
      startAngle: -90,
    });
  });

  it('拒绝同时坐标根属性和 ChartCoordinate 声明', () => {
    expect(() =>
      inputFromProps(ScatterChart, {
        coordinate: 'polar2D',
        children: (
          <>
            <ChartData data={[{ x: 1, y: 2 }]} />
            <ScatterEncodings x="x" y="y" />
            <ChartCoordinate coordinate="cartesian2D" />
          </>
        ),
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzChartReactErrorCode.Default,
        details: expect.objectContaining({ message: expect.stringMatching(/coordinate.*both/iu) }),
      }),
    );
  });

  it('通过 Vanilla 规范化映射 ChartCoordinate 字符串和对象声明', () => {
    const stringInput = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <ChartCoordinate coordinate="polar2D" />
      </>,
    );
    const objectInput = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <>
          <ChartCoordinate coordinate={{ type: 'polar2D', innerRadius: 0 }} />
        </>
      </>,
    );

    expect(stringInput.source).toEqual(
      normalizeScatterChart({
        data: { reference: 'chart.data' },
        coordinate: 'polar2D',
        encodings: { x: 'x', y: 'y' },
      }),
    );
    expect(objectInput.source).toEqual(
      normalizeScatterChart({
        data: { reference: 'chart.data' },
        coordinate: { type: 'polar2D', innerRadius: 0 },
        encodings: { x: 'x', y: 'y' },
      }),
    );
  });

  it('通过键入的 Vanilla 输入映射 Connected Scatter 和 Ranged Dot 声明', () => {
    const connected = inputOf(
      ConnectedScatterChart,
      <>
        <ChartData data={[{ x: 1, y: 2, year: 2020 }]} />
        <ConnectedScatterEncodings x="x" y="y" order="year" />
        <ConnectedScatterProperties path={{ dashPattern: [4, 2] }} />
        <ConnectedScatterMark properties={{ point: { size: 5 } }} />
      </>,
    );

    expect(connected.source).toEqual(
      normalizeConnectedScatterChart({
        data: { reference: 'chart.data' },
        encodings: { x: 'x', y: 'y', order: 'year' },
        properties: { path: { dashPattern: [4, 2] } },
        marks: [{ kind: 'connected-scatter', properties: { point: { size: 5 } } }],
      }),
    );

    const ranged = inputOf(
      RangedDotChart,
      <>
        <ChartData data={[{ category: 'A', start: 1, end: 2 }]} />
        <RangedDotEncodings category="category" start="start" end="end" />
        <RangedDotProperties endPoint={{ shape: 'diamond' }} />
        <RangedDotMark override properties={{ range: { strokeWidth: 3 } }} />
      </>,
    );

    expect(ranged.source).toEqual(
      normalizeRangedDotChart({
        data: { reference: 'chart.data' },
        encodings: { category: 'category', start: 'start', end: 'end' },
        properties: { endPoint: { shape: 'diamond' } },
        marks: [{ kind: 'ranged-dot', override: true, properties: { range: { strokeWidth: 3 } } }],
      }),
    );
  });

  it('强制连接散点和范围点声明基数', () => {
    expect(() => inputOf(ConnectedScatterChart, <ChartData data={[]} />)).toThrow(
      /ConnectedScatterEncodings.*exactly once/i,
    );
    expect(() =>
      inputOf(
        ConnectedScatterChart,
        <>
          <ChartData data={[]} />
          <ConnectedScatterEncodings x="x" y="y" order="order" />
          <ConnectedScatterProperties point={{ size: 4 }} />
          <ConnectedScatterProperties point={{ size: 5 }} />
        </>,
      ),
    ).toThrow(/ConnectedScatterProperties.*at most once/i);

    expect(() => inputOf(RangedDotChart, <ChartData data={[]} />)).toThrow(/RangedDotEncodings.*exactly once/i);
    expect(() =>
      inputOf(
        RangedDotChart,
        <>
          <ChartData data={[]} />
          <RangedDotEncodings category="category" start="start" end="end" />
          <RangedDotProperties point={{ size: 4 }} />
          <RangedDotProperties point={{ size: 5 }} />
        </>,
      ),
    ).toThrow(/RangedDotProperties.*at most once/i);
  });

  it('通过一台独立或嵌入式 SVG 宿主渲染连接散点和范围点', () => {
    const charts = [
      <ConnectedScatterChart key="connected">
        <ChartData data={[{ x: 1, y: 2, order: 1 }]} />
        <ConnectedScatterEncodings x="x" y="y" order="order" />
      </ConnectedScatterChart>,
      <RangedDotChart key="ranged">
        <ChartData data={[{ category: 'A', start: 1, end: 2 }]} />
        <RangedDotEncodings category="category" start="start" end="end" />
      </RangedDotChart>,
    ];

    for (const chart of charts) {
      expect(renderToStaticMarkup(chart).match(/<svg/g)).toHaveLength(1);
      expect(renderToStaticMarkup(<Layout>{chart}</Layout>).match(/<svg/g)).toHaveLength(1);
    }
  });

  it('映射精确的 Bubble 声明并保留编写的标记顺序', () => {
    const input = inputOf(
      BubbleChart,
      <>
        {requiredBubbleDeclarations}
        <BubbleProperties opacity={0.75} />
        <BubbleMark override properties={{ strokeWidth: 1 }} />
        <BubbleMark properties={{ opacity: 0.5 }} />
      </>,
    );

    expect(input.source).toEqual(
      normalizeBubbleChart({
        data: { reference: 'chart.data' },
        encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
        properties: { opacity: 0.75 },
        marks: [
          { kind: 'bubble', override: true, properties: { strokeWidth: 1 } },
          { kind: 'bubble', properties: { opacity: 0.5 } },
        ],
      }),
    );
  });

  it('需要 1 个 BubbleEncodings 声明，最多 1 个 BubbleProperties 声明', () => {
    expect(() =>
      inputOf(
        BubbleChart,
        <>
          <ChartData data={[]} />
        </>,
      ),
    ).toThrow(/BubbleEncodings.*exactly once/i);

    expect(() =>
      inputOf(
        BubbleChart,
        <>
          {requiredBubbleDeclarations}
          <BubbleProperties opacity={0.5} />
          <BubbleProperties opacity={0.75} />
        </>,
      ),
    ).toThrow(/BubbleProperties.*at most once/i);
  });

  it('通过一台 SVG 宿主独立渲染 Bubble', () => {
    const markup = renderToStaticMarkup(
      <BubbleChart>
        {requiredBubbleDeclarations}
        <BubbleProperties domainPadding={{ kind: 'ratio', default: 0.04, left: 0.02 }} />
      </BubbleChart>,
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
  });

  it('使用嵌套属性映射精确的回归声明并保留片段/数组标记顺序', () => {
    const marks = [
      <RegressionMark key="override" override properties={{ point: { opacity: 0.25 }, trend: { strokeWidth: 3 } }} />,
      <RegressionMark key="append" encodings={{ y: 'alternateY' }} properties={{ method: { kind: 'quadratic' } }} />,
    ];
    const input = inputOf(
      RegressionChart,
      <>
        {requiredRegressionDeclarations}
        <RegressionProperties
          method={{ kind: 'polynomial', order: 3 }}
          sampleCount={16}
          point={{ size: 5, opacity: 0.6 }}
          trend={{ strokeWidth: 2, opacity: { stroke: 0.8 } }}
        />
        <>{marks}</>
      </>,
    );

    expect(input.source).toEqual(
      normalizeRegressionChart({
        data: { reference: 'chart.data' },
        encodings: { x: 'x', y: 'y', series: 'species' },
        properties: {
          method: { kind: 'polynomial', order: 3 },
          sampleCount: 16,
          point: { size: 5, opacity: 0.6 },
          trend: { strokeWidth: 2, opacity: { stroke: 0.8 } },
        },
        marks: [
          {
            kind: 'regression',
            override: true,
            properties: { point: { opacity: 0.25 }, trend: { strokeWidth: 3 } },
          },
          {
            kind: 'regression',
            encodings: { y: 'alternateY' },
            properties: { method: { kind: 'quadratic' } },
          },
        ],
      }),
    );
  });

  it('强制回归单例声明和直接子边界', () => {
    expect(() =>
      inputOf(
        RegressionChart,
        <>
          <ChartData data={[]} />
        </>,
      ),
    ).toThrow(/RegressionEncodings.*exactly once/i);

    expect(() =>
      inputOf(
        RegressionChart,
        <>
          {requiredRegressionDeclarations}
          <RegressionProperties sampleCount={8} />
          <RegressionProperties sampleCount={16} />
        </>,
      ),
    ).toThrow(/RegressionProperties.*at most once/i);

    expect(() =>
      inputOf(
        RegressionChart,
        <section>
          {requiredRegressionDeclarations}
          <RegressionMark />
        </section>,
      ),
    ).toThrow(/direct Chart child/i);
  });

  it('独立渲染回归并通过一台 SVG 宿主嵌入', () => {
    const chart = <RegressionChart>{requiredRegressionDeclarations}</RegressionChart>;
    const standalone = renderToStaticMarkup(chart);
    const embedded = renderToStaticMarkup(<Layout>{chart}</Layout>);

    expect(standalone.match(/<svg/g)).toHaveLength(1);
    expect(embedded.match(/<svg/g)).toHaveLength(1);
  });

  it('通过一台 SVG 宿主渲染独立和嵌入的 Chart，并继承外部 Theme 模式', () => {
    const chart = <ScatterChart>{requiredDeclarations}</ScatterChart>;
    const standalone = renderToStaticMarkup(chart);
    const embedded = renderToStaticMarkup(<Layout theme={{ mode: 'dark' }}>{chart}</Layout>);

    expect(standalone.match(/<svg/g)).toHaveLength(1);
    expect(embedded.match(/<svg/g)).toHaveLength(1);
    expect(embedded).not.toContain('data-retikz-id');
    expect(embedded).toContain('hsl(210, 50%, 60%)');
    expect(embedded).not.toContain('hsl(210, 38%, 48%)');
  });

  it.each([
    { name: 'ChartData', children: <ScatterEncodings x="x" y="y" /> },
    { name: 'ScatterEncodings', children: <ChartData data={[]} /> },
  ])('仅需要一个 $name 声明', ({ name, children }) => {
    expect(() => inputOf(ScatterChart, children)).toThrow(new RegExp(`${name}.*exactly once`, 'i'));
  });

  it.each([
    {
      name: 'ChartData',
      declarations: (
        <>
          <ChartData data={[]} />
          <ChartData data={[]} />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    },
    {
      name: 'ChartLayout',
      declarations: (
        <>
          {requiredDeclarations}
          <ChartLayout layout={{ width: 10 }} />
          <ChartLayout layout={{ height: 10 }} />
        </>
      ),
    },
    {
      name: 'ChartCoordinate',
      declarations: (
        <>
          {requiredDeclarations}
          <ChartCoordinate coordinate="polar2D" />
          <ChartCoordinate coordinate="cartesian2D" />
        </>
      ),
    },
    {
      name: 'ChartExtension',
      declarations: (
        <>
          {requiredDeclarations}
          <ChartExtension />
          <ChartExtension />
        </>
      ),
    },
    {
      name: 'ScatterEncodings',
      declarations: (
        <>
          <ChartData data={[]} />
          <ScatterEncodings x="x" y="y" />
          <ScatterEncodings x="x" y="y" />
        </>
      ),
    },
    {
      name: 'ScatterProperties',
      declarations: (
        <>
          {requiredDeclarations}
          <ScatterProperties opacity={0.2} />
          <ScatterProperties opacity={0.4} />
        </>
      ),
    },
  ])('拒绝重复的 $name 单例声明', ({ name, declarations }) => {
    expect(() => inputOf(ScatterChart, declarations)).toThrow(new RegExp(`${name}.*at most once`, 'i'));
  });

  it('将呈现标记标准化为独立于 JSX 顺序的固定槽', () => {
    const input = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <ChartSource>Source</ChartSource>
        <ChartSubtitle>Subtitle</ChartSubtitle>
        <ChartTitle>
          <Text font={{ weight: 'bold' }}>Title</Text>
        </ChartTitle>
        <ChartNote>Note</ChartNote>
      </>,
    );

    expect(input.source.presentation).toEqual({
      title: { text: [{ text: 'Title', font: { weight: 'bold' } }] },
      subtitle: { text: 'Subtitle' },
      note: { text: 'Note' },
      source: { text: 'Source' },
    });
  });

  it('拒绝重复的呈现槽和非文本呈现负载', () => {
    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <ChartTitle>First</ChartTitle>
          <ChartTitle>Second</ChartTitle>
        </>,
      ),
    ).toThrow(/may appear at most once/);

    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <ChartTitle>
            <div>not text</div>
          </ChartTitle>
        </>,
      ),
    ).toThrow(/accept only strings, Fragment, or Text/);
  });

  it('映射精确的 Scatter 声明并保留直接标记顺序', () => {
    const input = inputOf(
      ScatterChart,
      <>
        <ChartData
          data={[
            { x: 1, y: 2 },
            { x: 2, y: 4 },
          ]}
        />
        <ScatterEncodings x="x" y="y" />
        <ScatterProperties opacity={0.4} />
        <ScatterMark override properties={{ opacity: 0.25 }} />
        <ScatterMark properties={{ opacity: 0 }} />
      </>,
    );

    expect(input.source).toMatchObject({
      type: 'point',
      recipe: {
        chartType: 'scatter',
        properties: { opacity: 0.4 },
        marks: [
          { kind: 'scatter', override: true, properties: { opacity: 0.25 } },
          { kind: 'scatter', properties: { opacity: 0 } },
        ],
      },
    });
  });

  it('映射精确的 Strip 声明，保留正常抖动值，并匹配 Vanilla', () => {
    const rows = [
      { category: 'A', value: 2 },
      { category: 'B', value: 4 },
    ];
    const encodings = {
      x: { field: 'category', scale: { operation: { type: 'point' as const, name: 'category' } } },
      y: { field: 'value', scale: { operation: { type: 'linear' as const, name: 'value' } } },
    };
    const input = inputOf(
      StripChart,
      <>
        <ChartData data={rows} reference="strip.rows" />
        <StripEncodings {...encodings} />
        <StripProperties jitter={{ span: 0, seed: 0, distribution: { kind: 'normal', sigma: 0.5 } }} size={5} />
        <StripMark override properties={{ jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } }} />
        <StripMark encodings={{ x: 'alternateCategory' }} properties={{ opacity: 0.4 }} />
      </>,
    );
    const vanilla = normalizeStripChart({
      data: { reference: 'strip.rows' },
      encodings,
      properties: { jitter: { span: 0, seed: 0, distribution: { kind: 'normal', sigma: 0.5 } }, size: 5 },
      marks: [
        { kind: 'strip', override: true, properties: { jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } } },
        { kind: 'strip', encodings: { x: 'alternateCategory' }, properties: { opacity: 0.4 } },
      ],
    });

    expect(input.source).toEqual(vanilla);
    expect(input.input.data).toBe(rows);
  });

  it('支持仅声明和混合 Strip 编写，同时拒绝同槽重复', () => {
    const declarationOnly = inputOf(StripChart, requiredStripDeclarations);
    const hybrid = inputFromProps(StripChart, {
      rows: [
        { category: 'A', value: 2 },
        { category: 'B', value: 4 },
      ],
      data: { reference: 'strip.hybrid' },
      children: (
        <StripEncodings
          x={{ field: 'category', scale: { operation: { type: 'band', name: 'category' } } }}
          y={{ field: 'value', scale: { operation: { type: 'linear', name: 'value' } } }}
        />
      ),
    });

    expect(declarationOnly.source.recipe.chartType).toBe('strip');
    expect(hybrid.source.data.reference).toBe('strip.hybrid');
    expect(() =>
      inputFromProps(StripChart, {
        rows: [{ category: 'A', value: 2 }],
        recipe: { encodings: { x: 'category', y: 'value' } },
        children: <StripEncodings x="category" y="value" />,
      }),
    ).toThrow(/recipe\.encodings.*both/i);
  });

  it('通过共享独立宿主渲染有限确定性 Strip 点', () => {
    const chart = (
      <StripChart layout={{ width: 360, height: 240 }}>
        {requiredStripDeclarations}
        <StripProperties jitter={{ seed: 11 }} />
      </StripChart>
    );
    const first = renderToStaticMarkup(chart);
    const second = renderToStaticMarkup(chart);

    expect(first).toBe(second);
    expect(first).toContain('<ellipse');
    expect(first).not.toMatch(/NaN|Infinity/);
  });

  it('与编码驱动方面的 Vanilla 匹配，并通过 ChartExtension 委托 Plot 声明', () => {
    const input = inputOf(
      ScatterChart,
      <>
        <ChartData data={[{ amount: 1, margin: 2, region: 'north' }]} />
        <ScatterEncodings x="amount" y="margin" column="region" facet={{ spacing: { panelGap: 12 } }} />
        <ChartExtension>
          <PlotTransform operation={{ kind: 'sort', params: { field: 'amount', order: 'descending' } }} />
          <PlotAxis dimension="x" grid />
        </ChartExtension>
      </>,
    );
    const vanilla = normalizeScatterChart({
      data: { reference: 'chart.data' },
      encodings: {
        x: 'amount',
        y: 'margin',
        column: 'region',
        facet: { spacing: { panelGap: 12 } },
      },
      plotExtension: {
        transform: [{ operation: { kind: 'sort', params: { field: 'amount', order: 'descending' } } }],
        guides: [{ type: 'axis', dimension: 'x', grid: true }],
      },
    });

    expect(input.source).toEqual(vanilla);
  });

  it('对于空的 ChartExtension 声明，不会具体化 plotExtension', () => {
    const input = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <ChartExtension />
      </>,
    );

    expect(input.source).not.toHaveProperty('plotExtension');
  });

  it('保持 Transform 附加顺序并报告 Plot 属性子集合冲突', () => {
    const input = inputOf(
      ScatterChart,
      <>
        <ChartData data={[{ amount: 1, margin: 2 }]} />
        <ScatterEncodings x="amount" y="margin" />
        <ChartExtension transform={[{ operation: { kind: 'sort', params: { field: 'amount', order: 'descending' } } }]}>
          <PlotTransform operation={{ kind: 'sort', params: { field: 'margin', order: 'ascending' } }} />
        </ChartExtension>
      </>,
    );

    expect(input.source.plotExtension?.transform).toEqual([
      { operation: { kind: 'sort', params: { field: 'amount', order: 'descending' } } },
      { operation: { kind: 'sort', params: { field: 'margin', order: 'ascending' } } },
    ]);

    expect(() =>
      inputOf(
        ScatterChart,
        <>
          <ChartData data={[{ amount: 1, margin: 2 }]} />
          <ScatterEncodings x="amount" y="margin" />
          <ChartExtension guides={[{ type: 'axis', dimension: 'x' }]}>
            <PlotAxis dimension="y" />
          </ChartExtension>
        </>,
      ),
    ).toThrow(/PLOT_VANILLA_DUPLICATE_DECLARATION_SOURCE/i);
  });

  it('拒绝根 ChartCoordinate 与子组合的组合', () => {
    expect(() =>
      ScatterChartSchema.parse(
        inputOf(
          ScatterChart,
          <>
            <ChartData data={[{ x: 1, y: 2, region: 'north' }]} />
            <ScatterEncodings x="x" y="y" />
            <ChartCoordinate coordinate="cartesian2D" />
            <ChartExtension>
              <PlotFacet id="regions" row="region">
                <PointMark encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }} />
              </PlotFacet>
            </ChartExtension>
          </>,
        ).source,
      ),
    ).toThrowError(
      expect.objectContaining({ issues: [expect.objectContaining({ path: ['plotExtension', 'composition'] })] }),
    );
  });

  it('在显式 Plot 扩展标记之前渲染 Chart 拥有的标记', () => {
    const markup = renderToStaticMarkup(
      <ScatterChart>
        <ChartData data={[{ x: 1, y: 2 }]} />
        <ScatterEncodings x="x" y="y" />
        <ScatterMark properties={{ fill: '#ff0000' }} />
        <ChartExtension>
          <PointMark
            encodings={{ position: { x: { field: 'x' }, y: { field: 'y' } } }}
            properties={{ fill: '#0000ff' }}
          />
        </ChartExtension>
      </ScatterChart>,
    );

    expect(markup.indexOf('fill="#ff0000"')).toBeGreaterThan(-1);
    expect(markup.indexOf('fill="#0000ff"')).toBeGreaterThan(markup.indexOf('fill="#ff0000"'));
  });

  it('拒绝 ChartExtension 外部的 Plot 声明和内部的 Chart 声明', () => {
    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <PlotAxis dimension="x" />
        </>,
      ),
    ).toThrow(/Plot declarations.*ChartExtension/i);

    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <ChartExtension>
            <ChartData data={[]} />
          </ChartExtension>
        </>,
      ),
    ).toThrow(/PLOT_VANILLA_UNSUPPORTED_CHART_CHILD/i);
  });

  it('拒绝普通的迭代和自定义包装器，而不是扩大直接子语义', () => {
    const iterableChildren = new Set<ReactNode>([<PlotAxis key="axis" dimension="x" />]);

    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <ChartExtension>{iterableChildren}</ChartExtension>
        </>,
      ),
    ).toThrow(/ChartExtension.*arrays.*Fragment/i);

    expect(() =>
      inputOf(
        ScatterChart,
        <section>
          {requiredDeclarations}
          <ScatterMark />
        </section>,
      ),
    ).toThrow(/direct Chart child/i);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    '拒绝非正或非有限独立 ChartLayout 宽度 %s',
    width => {
      expect(() =>
        renderToStaticMarkup(
          <ScatterChart>
            {requiredDeclarations}
            <ChartLayout width={width} height={100} />
          </ScatterChart>,
        ),
      ).toThrowError(
        expect.objectContaining({
          name: 'RetikzChartReactError',
          code: RetikzChartReactErrorCode.Default,
          message: expect.stringMatching(/ChartLayout.*width.*positive finite/i),
        }),
      );
    },
  );

  it('除非存在显式布局，否则将独立尺寸镜像到 Source 布局中', () => {
    const mirrored = renderToStaticMarkup(
      <ScatterChart>
        {requiredDeclarations}
        <ChartLayout width={640} height={360} />
      </ScatterChart>,
    );
    const explicit = renderToStaticMarkup(
      <ScatterChart>
        {requiredDeclarations}
        <ChartLayout width={640} height={360} layout={{ width: 320, height: 180 }} />
      </ScatterChart>,
    );

    expect(mirrored).toMatch(/^<svg[^>]*width="640" height="360"/);
    expect(mirrored).toContain('viewBox="0 0 640 360"');
    expect(explicit).toMatch(/^<svg[^>]*width="640" height="360"/);
    expect(explicit).toContain('viewBox="0 0 320 180"');
  });

  it('固定尺寸取景覆盖根与 declaration 写法，嵌入时仍由外层决定取景', () => {
    const root = renderToStaticMarkup(
      <ScatterChart layout={{ width: 320, height: 180 }}>{requiredDeclarations}</ScatterChart>,
    );
    const declaration = renderToStaticMarkup(
      <ScatterChart>
        {requiredDeclarations}
        <ChartLayout layout={{ width: 320, height: 180 }} />
      </ScatterChart>,
    );
    const embedded = renderToStaticMarkup(
      <Layout>
        <ScatterChart layout={{ width: 320, height: 180 }}>{requiredDeclarations}</ScatterChart>
      </Layout>,
    );

    expect(root).toContain('viewBox="0 0 320 180"');
    expect(declaration).toContain('viewBox="0 0 320 180"');
    expect(embedded).toContain('viewBox="-10 -10 340 200"');
  });

  it('仅指定一个维度时继续自动取景', () => {
    const svg = renderToStaticMarkup(<ScatterChart layout={{ width: 320 }}>{requiredDeclarations}</ScatterChart>);

    expect(svg).toContain('viewBox="-10 -10 340 ');
  });

  it('拒绝嵌入式宿主尺寸，但接受仅 Source 布局', () => {
    expect(() =>
      inputOf(
        ScatterChart,
        <>
          {requiredDeclarations}
          <ChartLayout width={640} />
        </>,
      ),
    ).toThrow(/embedded Chart.*ChartLayout.*width.*outer.*Layout/i);

    const input = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <ChartLayout layout={{ width: 320, height: 180 }} />
      </>,
    );

    expect(input.source.layout).toEqual({ width: 320, height: 180 });
  });
});
