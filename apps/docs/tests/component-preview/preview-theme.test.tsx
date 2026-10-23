// @vitest-environment jsdom

import { ChartData } from '@retikz/chart-react';
import { ScatterChart, ScatterEncodings } from '@retikz/chart-react/point';
import { ThemeMode } from '@retikz/core';
import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import { Layout, useTheme } from '@retikz/react';
import type { FC } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreviewDimensionsContext } from '../../src/modules/docs/components/component-preview/context';
import {
  PreviewDetailTable,
  PreviewEntity,
  PreviewFlowDiagram,
  PreviewGraph,
  PreviewRelation,
  PreviewThemeDefinitionBundle,
  PreviewThemeProvider,
  PreviewTheme,
  resolvePreviewTheme,
} from '../../src/modules/docs/components/component-preview/theme';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { logicFigureGraphProps } from '../../src/modules/docs/components/logic-figure';
import ThemeInheritance from '../../src/modules/docs/contents/kernel/components/layout/extend/theme-inheritance';
import ScatterResponsiveDemo from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { useComponentPreviewStore } from '../../src/modules/docs/store';

const originalTheme = useComponentPreviewStore.getState().themeName;

afterEach(() => {
  vi.restoreAllMocks();
  useComponentPreviewStore.getState().setTheme(originalTheme);
  document.body.replaceChildren();
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('ComponentPreview global theme', () => {
  it.each([
    { mode: ThemeMode.Light, color: 'hsl(210, 70%, 54%)' },
    { mode: ThemeMode.Dark, color: 'hsl(210, 76%, 64%)' },
  ])('applies the named $mode theme to the responsive Scatter demo', ({ mode, color }) => {
    const markup = renderToStaticMarkup(
      <PreviewThemeProvider theme={{ name: PreviewTheme.Vibrant, mode }}>
        <PreviewDimensionsContext.Provider value={{ width: 720, height: 440 }}>
          <ScatterResponsiveDemo />
        </PreviewDimensionsContext.Provider>
      </PreviewThemeProvider>,
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain(color);
    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('width="720"');
    expect(markup).toContain('height="440"');
  });

  it('updates responsive Chart colors when the preview theme changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    for (const style of [PreviewTheme.Default, PreviewTheme.Vibrant, PreviewTheme.Default]) {
      await act(async () => {
        root.render(
          <PreviewThemeProvider theme={resolvePreviewTheme(style, ThemeMode.Light)}>
            <PreviewDimensionsContext.Provider value={{ width: 720, height: 440 }}>
              <ScatterResponsiveDemo />
            </PreviewDimensionsContext.Provider>
          </PreviewThemeProvider>,
        );
        await Promise.resolve();
      });
      const color = style === PreviewTheme.Default ? 'hsl(210, 38%, 48%)' : 'hsl(210, 70%, 54%)';

      expect(container.innerHTML).toContain(color);
    }

    act(() => root.unmount());
  });

  it('renders the theme playground baseline with the ambient preview definitions', () => {
    const markup = renderToStaticMarkup(
      <PreviewThemeProvider>
        <ThemeInheritance />
      </PreviewThemeProvider>,
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('#dbeafe');
  });

  it('writes the selected Theme and ThemeMode as a Core selector', () => {
    expect(resolvePreviewTheme(PreviewTheme.Academic, ThemeMode.Dark)).toEqual({
      name: PreviewTheme.Academic,
      mode: ThemeMode.Dark,
    });
  });

  it('omits style when the docs default option is selected', () => {
    expect(resolvePreviewTheme(PreviewTheme.Default, ThemeMode.Light)).toEqual({ mode: ThemeMode.Light });
  });

  it('PreviewThemeProvider bridges persisted IDs to the React ambient Theme', () => {
    useComponentPreviewStore.getState().setTheme(PreviewTheme.Clean);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.name}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });

    expect(container.textContent).toBe(PreviewTheme.Clean);

    act(() => root.unmount());
  });

  it('keeps the Core default baseline when an explicit preview theme omits style', () => {
    useComponentPreviewStore.getState().setTheme(PreviewTheme.Vibrant);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.name ?? 'default'}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider theme={{ mode: ThemeMode.Light }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });

    expect(container.textContent).toBe('default');

    act(() => root.unmount());
  });

  it('keeps an explicit preview Theme above later global changes', () => {
    useComponentPreviewStore.getState().setTheme(PreviewTheme.Clean);

    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.name}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider theme={{ name: PreviewTheme.Academic, mode: ThemeMode.Light }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });

    expect(container.textContent).toBe(PreviewTheme.Academic);

    act(() => useComponentPreviewStore.getState().setTheme(PreviewTheme.Vibrant));

    expect(container.textContent).toBe(PreviewTheme.Academic);

    act(() => root.unmount());
  });

  it('passes an explicit preview dark mode to the React ambient Theme', () => {
    const ThemeReader: FC = () => {
      const theme = useTheme();
      return <output>{theme?.mode}</output>;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PreviewThemeProvider theme={{ mode: ThemeMode.Dark }}>
          <ThemeReader />
        </PreviewThemeProvider>,
      );
    });

    expect(container.textContent).toBe('dark');

    act(() => root.unmount());
  });

  it('renders a standalone preview Table without registering docs definitions twice', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ name: PreviewTheme.Academic, mode: ThemeMode.Light }}>
          <PreviewDetailTable
            id="preview-table"
            dataRef="people"
            data={[{ name: 'Ada' }]}
            columns={[{ id: 'name', field: 'name' }]}
          />
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('makes the selected Chart Theme available to standalone Chart previews', () => {
    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ name: PreviewTheme.Vibrant, mode: ThemeMode.Light }}>
          <ScatterChart>
            <ChartData data={[{ income: 12000, life: 74 }]} />
            <ScatterEncodings x="income" y="life" />
          </ScatterChart>
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('renders standalone Graph previews with the default theme', () => {
    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ mode: ThemeMode.Light }}>
          <Graph width={240} height={120}>
            <Entity id="source" role="activity" position={[60, 60]}>
              Source
            </Entity>
            <Entity id="target" role="event" position={[180, 60]}>
              Target
            </Entity>
            <Relation source={{ id: 'source' }} target={{ id: 'target' }} role="flow" />
          </Graph>
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('renders standalone Flow previews with the default theme', () => {
    expect(() =>
      renderToStaticMarkup(
        <PreviewThemeProvider theme={{ mode: ThemeMode.Light }}>
          <PreviewFlowDiagram width={320} height={180}>
            <FlowEntity id="source" text="Source" />
            <FlowEntity id="target" text="Target" />
            <FlowRelation source="source" target="target" />
          </PreviewFlowDiagram>
        </PreviewThemeProvider>,
      ),
    ).not.toThrow();
  });

  it('keeps logic theme defaults out of Source IR and honors explicit font overrides', () => {
    const preview = buildPreviewIR(() => (
      <PreviewFlowDiagram {...logicFigureGraphProps()}>
        <FlowEntity id="source" text="Source" kind="docs.logic.important" role="activity" />
        <FlowEntity id="target" text="Target" />
        <FlowRelation source="source" target="target" label="Next" />
      </PreviewFlowDiagram>
    ));
    const source = preview.sourceIr.children[0];
    expect(source).not.toHaveProperty('graphRules');
    expect(source).not.toHaveProperty('defaultFlow');
    expect(source).not.toHaveProperty('groups');
    expect(source).not.toHaveProperty('layouts');
    for (const mode of [ThemeMode.Light, ThemeMode.Dark]) {
      const output = buildVanillaPreview(preview, { theme: { mode } });
      expect(output.svg).toContain('font-size="14"');
      expect(output.svg).toContain('font-size="12"');
    }
    const override = buildPreviewIR(() => (
      <PreviewFlowDiagram {...logicFigureGraphProps()} defaultFlow={{ entity: { style: { font: { size: 20 } } } }}>
        <FlowEntity id="source" text="Source" />
      </PreviewFlowDiagram>
    ));
    expect(buildVanillaPreview(override, { theme: { mode: ThemeMode.Light } }).svg).toContain('font-size="20"');
  });

  it('adds Graph definitions only at the Graph authoring boundary', () => {
    const graph = PreviewGraph.createInputEmbedProps?.(
      {},
      { id: 'preview', kind: PreviewGraph.inputEmbedAdapter.kind },
    );
    const graphRecord = graph as Readonly<Record<string, unknown>>;
    const graphOptions = (graphRecord.input as Readonly<Record<string, unknown>> | undefined) ?? graphRecord;

    expect(graphOptions).toMatchObject({ graphThemeDefinitions: PreviewThemeDefinitionBundle.graph });

    for (const component of [PreviewEntity, PreviewRelation]) {
      const embedded = component.createInputEmbedProps?.({}, { id: 'preview', kind: component.inputEmbedAdapter.kind });
      const record = embedded as Readonly<Record<string, unknown>>;
      const options = (record.input as Readonly<Record<string, unknown>> | undefined) ?? record;

      expect(options).not.toHaveProperty('graphThemeDefinitions');
    }
  });

  it('renders a standalone Entity Vanilla preview with a named Graph theme', () => {
    const preview = buildPreviewIR(() => (
      <Layout>
        <PreviewEntity role="participant" position={[40, 40]} />
      </Layout>
    ));
    const output = buildVanillaPreview(preview, {
      theme: { mode: ThemeMode.Light, name: PreviewThemeDefinitionBundle.graph[0].name },
    });

    expect(output.svg).toContain('<svg');
    expect(output.code).toContain('createGraphProviders');
    expect(output.code).toContain('normalizeScene(source, { adapters }).ir');
    expect(output.code).not.toMatch(/entity\([^)]*graphThemeDefinitions/s);
  });
});
