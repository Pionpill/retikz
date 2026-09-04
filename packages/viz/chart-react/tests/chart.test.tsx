import type { ReactNode } from 'react';

import { normalizeBubbleChart } from '@retikz/chart-vanilla/point/bubble';
import { normalizeConnectedScatterChart } from '@retikz/chart-vanilla/point/connected-scatter';
import { normalizeRangedDotChart } from '@retikz/chart-vanilla/point/ranged-dot';
import { normalizeRegressionChart } from '@retikz/chart-vanilla/point/regression';
import { normalizeScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { normalizeStripChart } from '@retikz/chart-vanilla/point/strip';
import { PlotAxis, PlotFacet, PlotTransform, PointMark } from '@retikz/plot-react';
import { Layout, Text } from '@retikz/react';
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
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

const inputOf = <TInput,>(component: InputComponent<TInput>, children: ReactNode): TInput =>
  component.createInputEmbedProps({ children });

const inputFromProps = <TInput,>(component: InputComponent<TInput>, props: Readonly<Record<string, unknown>>): TInput =>
  component.createInputEmbedProps(props);

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
    createInput: () =>
      BubbleChart.createInputEmbedProps({ coordinate: 'polar2D', children: requiredBubbleDeclarations }),
  },
  {
    name: 'ConnectedScatterChart',
    createInput: () =>
      ConnectedScatterChart.createInputEmbedProps({
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
      RangedDotChart.createInputEmbedProps({
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
      RegressionChart.createInputEmbedProps({ coordinate: 'polar2D', children: requiredRegressionDeclarations }),
  },
  {
    name: 'ScatterChart',
    createInput: () => ScatterChart.createInputEmbedProps({ coordinate: 'polar2D', children: requiredDeclarations }),
  },
  {
    name: 'StripChart',
    createInput: () => StripChart.createInputEmbedProps({ coordinate: 'polar2D', children: requiredStripDeclarations }),
  },
] as const;

describe('Typed Point Chart React declarations', () => {
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
  ])('supports root-only IR-like authoring for $name', ({ chartType, createInput }) => {
    const input = createInput();

    expect(input.source).toMatchObject({
      namespace: 'chart',
      type: 'point',
      recipe: { chartType },
    });
  });

  it('maps every structured root slot through the existing Vanilla input', () => {
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
    expect(root.datasets['root.rows']).toBe(rows);
  });

  it('keeps declaration-only authoring equal to structured root authoring', () => {
    const rows = [{ x: 1, y: 2 }];
    const root = inputFromProps(ScatterChart, {
      rows,
      data: { reference: 'parity.rows' },
      layout: { width: 320, height: 180 },
      presentation: { title: 'Parity' },
      recipe: { encodings: { x: 'x', y: 'y' }, properties: { opacity: 0.5 } },
    });
    const declarations = inputOf(
      ScatterChart,
      <>
        <ChartData data={rows} reference="parity.rows" />
        <ChartLayout layout={{ width: 320, height: 180 }} />
        <ChartTitle>Parity</ChartTitle>
        <ScatterEncodings x="x" y="y" />
        <ScatterProperties opacity={0.5} />
      </>,
    );

    expect(root.source).toEqual(declarations.source);
    expect(root.datasets).toEqual(declarations.datasets);
  });

  it('allows root and headless declarations to mix across owner slots', () => {
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

    expect(input.source.presentation).toEqual({ title: 'Child title', subtitle: 'Root subtitle' });
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
  ])('rejects root and declaration sources for the same $name slot', ({ name, createInput }) => {
    expect(createInput).toThrow(new RegExp(`${name}.*both`, 'iu'));
  });

  it('reports missing runtime rows and recipe encodings at the React boundary', () => {
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

  it('preserves authored zero, false, and empty arrays from structured root recipe slots', () => {
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

  it('uses root layout dimensions for a standalone host and keeps them Source-only when embedded', () => {
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
    'maps $name coordinate root props through Vanilla normalization',
    ({ createInput }) => {
      expect(createInput().source.coordinate).toEqual({
        type: 'polar2D',
        innerRadius: 0,
        startAngle: 0,
        endAngle: 360,
      });
    },
  );

  it('preserves a configured coordinate object from the concrete Chart root prop', () => {
    const input = ScatterChart.createInputEmbedProps({
      coordinate: { type: 'polar2D', innerRadius: 0, startAngle: -90 },
      children: requiredDeclarations,
    });

    expect(input.source.coordinate).toEqual({
      type: 'polar2D',
      innerRadius: 0,
      startAngle: -90,
      endAngle: 360,
    });
  });

  it('rejects simultaneous coordinate root prop and ChartCoordinate declaration', () => {
    expect(() =>
      ScatterChart.createInputEmbedProps({
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

  it('maps ChartCoordinate string and object declarations through Vanilla normalization', () => {
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

  it('maps Connected Scatter and Ranged Dot declarations through typed Vanilla inputs', () => {
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

  it('enforces Connected Scatter and Ranged Dot declaration cardinality', () => {
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

  it('renders Connected Scatter and Ranged Dot through one standalone or embedded SVG host', () => {
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
  it('maps exact Bubble declarations and preserves authored mark order', () => {
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

  it('requires one BubbleEncodings declaration and at most one BubbleProperties declaration', () => {
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

  it('renders Bubble standalone through one SVG host', () => {
    const markup = renderToStaticMarkup(
      <BubbleChart>
        {requiredBubbleDeclarations}
        <BubbleProperties domainPadding={{ kind: 'ratio', default: 0.04, left: 0.02 }} />
      </BubbleChart>,
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
  });

  it('maps exact Regression declarations with nested properties and preserves Fragment/array mark order', () => {
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
          trend={{ strokeWidth: 2, strokeOpacity: 0.8 }}
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
          trend: { strokeWidth: 2, strokeOpacity: 0.8 },
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

  it('enforces Regression singleton declarations and direct-child boundaries', () => {
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

  it('renders Regression standalone and embedded through one SVG host', () => {
    const chart = <RegressionChart>{requiredRegressionDeclarations}</RegressionChart>;
    const standalone = renderToStaticMarkup(chart);
    const embedded = renderToStaticMarkup(<Layout>{chart}</Layout>);

    expect(standalone.match(/<svg/g)).toHaveLength(1);
    expect(embedded.match(/<svg/g)).toHaveLength(1);
  });

  it('renders standalone and embedded Chart through one SVG host and inherits the outer Theme mode', () => {
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
  ])('requires exactly one $name declaration', ({ name, children }) => {
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
  ])('rejects duplicate $name singleton declarations', ({ name, declarations }) => {
    expect(() => inputOf(ScatterChart, declarations)).toThrow(new RegExp(`${name}.*at most once`, 'i'));
  });

  it('normalizes presentation markers into fixed slots independent of JSX order', () => {
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
      title: [{ text: 'Title', font: { weight: 'bold' } }],
      subtitle: 'Subtitle',
      note: 'Note',
      source: 'Source',
    });
  });

  it('rejects duplicate presentation slots and non-text presentation payloads', () => {
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

  it('maps exact Scatter declarations and preserves direct mark order', () => {
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

  it('maps exact Strip declarations, preserves zero jitter values, and matches Vanilla', () => {
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
        <StripProperties jitter={{ span: 0, seed: 0 }} size={5} />
        <StripMark override properties={{ jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } }} />
        <StripMark encodings={{ x: 'alternateCategory' }} properties={{ opacity: 0.4 }} />
      </>,
    );
    const vanilla = normalizeStripChart({
      data: { reference: 'strip.rows' },
      encodings,
      properties: { jitter: { span: 0, seed: 0 }, size: 5 },
      marks: [
        { kind: 'strip', override: true, properties: { jitter: { span: { kind: 'ratio', value: 0.5 }, seed: 7 } } },
        { kind: 'strip', encodings: { x: 'alternateCategory' }, properties: { opacity: 0.4 } },
      ],
    });

    expect(input.source).toEqual(vanilla);
    expect(input.datasets['strip.rows']).toBe(rows);
  });

  it('supports declaration-only and hybrid Strip authoring while rejecting same-slot duplicates', () => {
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

  it('renders finite deterministic Strip points through the shared standalone host', () => {
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

  it('matches Vanilla for encoding-driven facets and delegates Plot declarations through ChartExtension', () => {
    const input = inputOf(
      ScatterChart,
      <>
        <ChartData data={[{ amount: 1, margin: 2, region: 'north' }]} />
        <ScatterEncodings x="amount" y="margin" column="region" facet={{ spacing: { panelGap: 12 } }} />
        <ChartExtension>
          <PlotTransform kind="sort" field="amount" order="descending" />
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
        transform: [{ kind: 'sort', field: 'amount', order: 'descending' }],
        guides: [{ type: 'axis', dimension: 'x', grid: true }],
      },
    });

    expect(input.source).toEqual(vanilla);
  });

  it('does not materialize plotExtension for an empty ChartExtension declaration', () => {
    const input = inputOf(
      ScatterChart,
      <>
        {requiredDeclarations}
        <ChartExtension />
      </>,
    );

    expect(input.source).not.toHaveProperty('plotExtension');
  });

  it('keeps Transform append order and reports Plot prop-child collection conflicts', () => {
    const input = inputOf(
      ScatterChart,
      <>
        <ChartData data={[{ amount: 1, margin: 2 }]} />
        <ScatterEncodings x="amount" y="margin" />
        <ChartExtension transform={[{ kind: 'sort', field: 'amount', order: 'descending' }]}>
          <PlotTransform kind="sort" field="margin" order="ascending" />
        </ChartExtension>
      </>,
    );
    expect(input.source.plotExtension?.transform).toEqual([
      { kind: 'sort', field: 'amount', order: 'descending' },
      { kind: 'sort', field: 'margin', order: 'ascending' },
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
    ).toThrow(/duplicate-declaration-source/i);
  });

  it('rejects root ChartCoordinate combined with child composition', () => {
    expect(() =>
      inputOf(
        ScatterChart,
        <>
          <ChartData data={[{ x: 1, y: 2, region: 'north' }]} />
          <ScatterEncodings x="x" y="y" />
          <ChartCoordinate coordinate="cartesian2D" />
          <ChartExtension>
            <PlotFacet id="regions" row="region">
              <PointMark x="x" y="y" />
            </PlotFacet>
          </ChartExtension>
        </>,
      ),
    ).toThrowError(
      expect.objectContaining({ issues: [expect.objectContaining({ path: ['plotExtension', 'composition'] })] }),
    );
  });

  it('renders Chart-owned marks before explicit Plot extension marks', () => {
    const markup = renderToStaticMarkup(
      <ScatterChart>
        <ChartData data={[{ x: 1, y: 2 }]} />
        <ScatterEncodings x="x" y="y" />
        <ScatterMark properties={{ fill: '#ff0000' }} />
        <ChartExtension>
          <PointMark x="x" y="y" fill="#0000ff" />
        </ChartExtension>
      </ScatterChart>,
    );

    expect(markup.indexOf('fill="#ff0000"')).toBeGreaterThan(-1);
    expect(markup.indexOf('fill="#0000ff"')).toBeGreaterThan(markup.indexOf('fill="#ff0000"'));
  });

  it('rejects Plot declarations outside ChartExtension and Chart declarations inside it', () => {
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
    ).toThrow(/unsupported-chart-child/i);
  });

  it('rejects ordinary iterables and custom wrappers instead of widening direct-child semantics', () => {
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
    'rejects non-positive or non-finite standalone ChartLayout width %s',
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

  it('mirrors standalone dimensions into Source layout unless an explicit layout is present', () => {
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
    expect(mirrored).toContain('viewBox="-10 -10 660 380"');
    expect(explicit).toMatch(/^<svg[^>]*width="640" height="360"/);
    expect(explicit).toContain('viewBox="-10 -10 340 200"');
  });

  it('rejects embedded host dimensions but accepts Source-only layout', () => {
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
