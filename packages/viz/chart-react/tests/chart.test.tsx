import type { ReactNode } from 'react';

import { normalizeScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { PlotAxis, PlotFacet, PlotTransform, PointMark } from '@retikz/plot-react';
import { Layout, Text } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ChartData,
  ChartExtension,
  ChartLayout,
  ChartNote,
  ChartSource,
  ChartSubtitle,
  ChartTitle,
  RetikzChartReactErrorCode,
} from '../src';
import { ScatterChart, ScatterEncodings, ScatterMark, ScatterProperties } from '../src/point/scatter';

type InputComponent<TInput> = {
  createInputEmbedProps: (props: Readonly<Record<string, unknown>>) => TInput;
};

const inputOf = <TInput,>(component: InputComponent<TInput>, children: ReactNode): TInput =>
  component.createInputEmbedProps({ children });

const requiredDeclarations = (
  <>
    <ChartData data={[{ x: 1, y: 2 }]} />
    <ScatterEncodings x="x" y="y" />
  </>
);

describe('Typed Point Chart React declarations', () => {
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

  it('rejects coordinate props combined with child composition through the Plot owner error contract', () => {
    expect(() =>
      inputOf(
        ScatterChart,
        <>
          <ChartData data={[{ x: 1, y: 2, region: 'north' }]} />
          <ScatterEncodings x="x" y="y" />
          <ChartExtension coordinate={{ type: 'cartesian2D' }}>
            <PlotFacet id="regions" row="region">
              <PointMark x="x" y="y" />
            </PlotFacet>
          </ChartExtension>
        </>,
      ),
    ).toThrow(/duplicate-declaration-source/i);
  });

  it('validates props-only ChartExtension conflicts through the Plot owner error contract', () => {
    expect(() =>
      inputOf(ScatterChart, [
        <ChartData key="data" data={[{ x: 1, y: 2 }]} />,
        <ScatterEncodings key="encodings" x="x" y="y" />,
        <ChartExtension
          key="extension"
          coordinate={{ type: 'cartesian2D' }}
          composition={{
            defaultView: 'main',
            views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
          }}
        />,
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: 'duplicate-declaration-source',
        details: {
          path: ['children', 2, 'props', 'composition'],
          conflictingPath: ['children', 2, 'props', 'coordinate'],
        },
      }),
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
