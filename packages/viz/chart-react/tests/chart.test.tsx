import { normalizeScatterChart } from '@retikz/chart-vanilla/point/scatter';
import { Text } from '@retikz/react';
import { describe, expect, it } from 'vitest';

import { ChartNote, ChartSource, ChartSubtitle, ChartTitle } from '../src';
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

describe('Typed Point Chart React authoring', () => {
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
    ).toThrow(/only presentation markers or ScatterMark as direct children/);
  });

  it('keeps host width and height out of Source layout', () => {
    const input = inputOf(ScatterChart, {
      data: [{ x: 1, y: 2 }],
      encodings: { x: 'x', y: 'y' },
      width: 640,
      height: 360,
    });
    expect(input.source).not.toHaveProperty('layout');
  });

  it('keeps the legacy generic source only as a fixture, not as a public component', () => {
    expect(source).toMatchObject({ type: 'point', recipe: { chartType: 'scatter' } });
  });
});
