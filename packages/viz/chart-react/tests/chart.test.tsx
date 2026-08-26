import { normalizeScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { PlotAxis, PlotTransform } from '@retikz/plot-react';
import { Layout, Text } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle, RetikzChartReactErrorCode } from '../src';
import { ScatterChart, ScatterMark } from '../src/point';

type InputComponent<TInput> = {
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

const inputOf = <TInput,>(component: InputComponent<TInput>, props: Readonly<Record<string, unknown>>): TInput =>
  component.createInputEmbedProps(props);

const source = normalizeScatterChart({
  id: 'people',
  data: { reference: 'rows' },
  encodings: { x: 'x', y: 'y' },
});

const chartHostPropKeys = [
  'width',
  'height',
  'className',
  'style',
  'renderer',
  'themeStyles',
  'runtime',
  'animate',
  'snapshotAt',
  'animationRef',
  'onArtifacts',
  'onCompileResult',
] as const;

describe('Typed Point Chart React authoring', () => {
  it.each(chartHostPropKeys)(
    'rejects embedded Chart own standalone host prop %s including explicit undefined',
    hostProp => {
      expect(() =>
        inputOf(ScatterChart, {
          data: [{ x: 1, y: 2 }],
          encodings: { x: 'x', y: 'y' },
          [hostProp]: undefined,
        }),
      ).toThrowError(
        expect.objectContaining({
          name: 'RetikzChartReactError',
          code: RetikzChartReactErrorCode.Default,
          message: expect.stringMatching(/embedded Chart.*standalone.*outer.*Layout/i),
        }),
      );
    },
  );

  it('renders standalone and embedded Chart through one SVG host and inherits the outer Theme mode', () => {
    const chart = <ScatterChart data={[{ x: 1, y: 2 }]} encodings={{ x: 'x', y: 'y' }} />;
    const standalone = renderToStaticMarkup(chart);
    const embedded = renderToStaticMarkup(<Layout theme={{ mode: 'dark' }}>{chart}</Layout>);

    expect(standalone.match(/<svg/g)).toHaveLength(1);
    expect(embedded.match(/<svg/g)).toHaveLength(1);
    expect(embedded).not.toContain('data-retikz-id');
    expect(embedded).toContain('hsl(210, 50%, 60%)');
    expect(embedded).not.toContain('hsl(210, 38%, 48%)');
  });

  it('normalizes presentation markers into fixed slots independent of JSX order', () => {
    const input = inputOf(ScatterChart, {
      data: [],
      encodings: { x: 'x', y: 'y' },
      children: (
        <>
          <ChartSource>Source</ChartSource>
          <ChartSubtitle>Subtitle</ChartSubtitle>
          <ChartTitle>
            <Text font={{ weight: 'bold' }}>Title</Text>
          </ChartTitle>
          <ChartNote>Note</ChartNote>
        </>
      ),
    });

    expect(input.source.presentation).toEqual({
      title: [{ text: 'Title', font: { weight: 'bold' } }],
      subtitle: 'Subtitle',
      note: 'Note',
      source: 'Source',
    });
  });

  it('rejects duplicate presentation slots', () => {
    expect(() =>
      inputOf(ScatterChart, {
        data: [],
        encodings: { x: 'x', y: 'y' },
        children: (
          <>
            <ChartTitle>First</ChartTitle>
            <ChartTitle>Second</ChartTitle>
          </>
        ),
      }),
    ).toThrow(/may appear at most once/);
  });

  it('rejects non-text presentation payloads', () => {
    expect(() =>
      inputOf(ScatterChart, {
        data: [],
        encodings: { x: 'x', y: 'y' },
        children: (
          <ChartTitle>
            <div>not text</div>
          </ChartTitle>
        ),
      }),
    ).toThrow(/accept only strings, Fragment, or Text/);
  });

  it('matches the precise Vanilla Source and preserves direct mark order', () => {
    const input = inputOf(ScatterChart, {
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
      ],
      encodings: { x: 'x', y: 'y' },
      properties: { opacity: 0.4 },
      children: (
        <>
          <ScatterMark override properties={{ opacity: 0.25 }} />
          <ScatterMark properties={{ opacity: 0 }} />
        </>
      ),
    });

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

  it('keeps component-level properties separate from child mark overrides', () => {
    const input = inputOf(ScatterChart, {
      data: [{ x: 1, y: 2 }],
      encodings: { x: 'x', y: 'y' },
      properties: { opacity: 0.4 },
      marks: [{ kind: 'scatter', properties: { opacity: 0.2 } }],
      children: <ScatterMark properties={{ opacity: 0 }} />,
    });
    expect(input.source.recipe.properties).toEqual({ opacity: 0.4 });
    expect(input.source.recipe.marks).toEqual([
      { kind: 'scatter', properties: { opacity: 0.2 } },
      { kind: 'scatter', properties: { opacity: 0 } },
    ]);
  });

  it('matches Vanilla when ScatterMark requests semantic group override', () => {
    const input = inputOf(ScatterChart, {
      data: [{ x: 1, y: 2 }],
      encodings: { x: 'x', y: 'y' },
      children: <ScatterMark override properties={{ opacity: 0.25 }} />,
    });
    const vanilla = normalizeScatterChart({
      data: { reference: 'chart.data' },
      encodings: { x: 'x', y: 'y' },
      marks: [{ kind: 'scatter', override: true, properties: { opacity: 0.25 } }],
    });

    expect(input.source).toEqual(vanilla);
  });

  it('matches Vanilla for encoding-driven facets and delegates Plot declarations to the Plot authoring chain', () => {
    const input = inputOf(ScatterChart, {
      data: [{ amount: 1, margin: 2, region: 'north' }],
      encodings: {
        x: 'amount',
        y: 'margin',
        column: 'region',
        facet: { spacing: { panelGap: 12 } },
      },
      children: (
        <>
          <PlotTransform kind="sort" field="amount" order="descending" />
          <PlotAxis dimension="x" grid />
        </>
      ),
    });
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

  it('preserves direct slot ownership across arrays and transparent Fragments', () => {
    const input = inputOf(ScatterChart, {
      data: [{ amount: 1, margin: 2, region: 'north' }],
      encodings: { x: 'amount', y: 'margin', column: 'region' },
      children: [
        <ChartTitle key="title">Facet example</ChartTitle>,
        <>
          <ScatterMark properties={{ opacity: 0.5 }} />
          <PlotAxis dimension="y" />
        </>,
      ],
    });

    expect(input.source.presentation).toEqual({ title: 'Facet example' });
    expect(input.source.recipe.marks).toEqual([{ kind: 'scatter', properties: { opacity: 0.5 } }]);
    expect(input.source.recipe.encodings.column).toEqual({ field: 'region' });
    expect(input.source.plotExtension?.guides).toEqual([{ type: 'axis', dimension: 'y' }]);
  });

  it('keeps Transform append order and reports Plot prop-child collection conflicts', () => {
    const input = inputOf(ScatterChart, {
      data: [{ amount: 1, margin: 2 }],
      encodings: { x: 'amount', y: 'margin' },
      plotExtension: { transform: [{ kind: 'sort', field: 'amount', order: 'descending' }] },
      children: <PlotTransform kind="sort" field="margin" order="ascending" />,
    });
    expect(input.source.plotExtension?.transform).toEqual([
      { kind: 'sort', field: 'amount', order: 'descending' },
      { kind: 'sort', field: 'margin', order: 'ascending' },
    ]);

    expect(() =>
      inputOf(ScatterChart, {
        data: [{ amount: 1, margin: 2 }],
        encodings: { x: 'amount', y: 'margin' },
        plotExtension: { guides: [{ type: 'axis', dimension: 'x' }] },
        children: <PlotAxis dimension="y" />,
      }),
    ).toThrow(/duplicate-declaration-source/i);
  });

  it('does not treat nested mark components as direct Chart marks', () => {
    expect(() =>
      inputOf(ScatterChart, {
        data: [{ x: 1, y: 2 }],
        encodings: { x: 'x', y: 'y' },
        children: (
          <section>
            <ScatterMark />
          </section>
        ),
      }),
    ).toThrow(/unsupported-chart-child/i);
  });

  it('keeps standalone host dimensions separate from explicit Source layout', () => {
    const markup = renderToStaticMarkup(
      <ScatterChart
        data={[{ x: 1, y: 2 }]}
        encodings={{ x: 'x', y: 'y' }}
        width={640}
        height={360}
        layout={{ width: 320, height: 180 }}
      />,
    );
    const input = inputOf(ScatterChart, {
      data: [{ x: 1, y: 2 }],
      encodings: { x: 'x', y: 'y' },
      layout: { width: 320, height: 180 },
    });

    expect(markup).toContain('width="640"');
    expect(markup).toContain('height="360"');
    expect(input.source.layout).toEqual({ width: 320, height: 180 });
  });

  it('keeps the legacy generic source only as a fixture, not as a public component', () => {
    expect(source).toMatchObject({ type: 'point', recipe: { chartType: 'scatter' } });
  });
});
