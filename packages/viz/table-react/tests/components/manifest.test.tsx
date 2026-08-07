// @vitest-environment jsdom
import type { IRChild } from '@retikz/core';
import type { CellPresentationInput, TableLayoutManifest } from '@retikz/table';

import { createManualTableSpec, defineCellPresentation, defineCellVisualScale } from '@retikz/table';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ManualTable, Table } from '../../src';

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Table React manifest observation', () => {
  it('does not call onManifest during render', () => {
    const onManifest = vi.fn();

    renderToStaticMarkup(<ManualTable rows={[[null]]} onManifest={onManifest} />);

    expect(onManifest).not.toHaveBeenCalled();
  });

  it('notifies after commit and deduplicates by serialized manifest content', async () => {
    const manifests: Array<TableLayoutManifest> = [];
    const onManifest = (manifest: TableLayoutManifest): void => {
      manifests.push(manifest);
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderTable = async (rows: number, width?: number): Promise<void> => {
      await act(() => {
        root.render(
          <ManualTable rows={Array.from({ length: rows }, () => [null])} width={width} onManifest={onManifest} />,
        );
      });
    };

    await renderTable(1, 200);
    await renderTable(1, 320);
    await renderTable(2, 320);

    expect(manifests).toHaveLength(2);
    expect(manifests[0].allocationBounds).toEqual({ x: 0, y: 0, width: 120, height: 32 });
    expect(manifests[1].allocationBounds).toEqual({ x: 0, y: 0, width: 120, height: 64 });

    await act(() => root.unmount());
    container.remove();
  });

  it('exposes Legend descriptor seeds produced by the generic Table entry', async () => {
    const manifests: Array<TableLayoutManifest> = [];
    const visualScale = defineCellVisualScale({
      name: 'react-manifest-palette',
      optionsSchema: z.strictObject({}),
      resolve: (_options, _values, context) => ({
        of: () => context.categoricalColors[0],
        legendForm: 'swatch',
        domain: [1],
        range: [context.categoricalColors[0]],
      }),
    });
    const spec = createManualTableSpec({
      id: 'encoded',
      rows: [[1]],
      tableThemeTokens: { 'data.categorical': ['#123456'] },
      encodings: [
        {
          id: 'palette',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'react-manifest-palette' },
          legend: { title: 'Palette' },
        },
      ],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Table spec={spec} visualScaleDefinitions={[visualScale]} onManifest={manifest => manifests.push(manifest)} />,
      );
    });

    expect(manifests[0].legendDescriptors).toEqual([
      {
        encodingId: 'palette',
        channel: 'backgroundFill',
        scaleName: 'react-manifest-palette',
        title: 'Palette',
        form: 'swatch',
        domain: [1],
        range: ['#123456'],
      },
    ]);
    await act(() => root.unmount());
    container.remove();
  });

  it('selects the exact root artifact when a nested Table repeats the root id', async () => {
    const manifests: Array<TableLayoutManifest> = [];
    const nested = createManualTableSpec({ id: 'repeated', rows: [[null], [null]] });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <ManualTable id="repeated" rows={[[{ content: nested }]]} onManifest={manifest => manifests.push(manifest)} />,
      );
    });

    expect(manifests).toHaveLength(1);
    expect(manifests[0].rows).toHaveLength(1);
    await act(() => root.unmount());
    container.remove();
  });

  it('does not recompile or renotify when only the observer identity changes', async () => {
    const content: IRChild = { type: 'node', position: [0, 0], text: 'stable' };
    const observed: Array<CellPresentationInput> = [];
    const present = vi.fn((input: CellPresentationInput) => {
      observed.push(input);
      return content;
    });
    const presentation = defineCellPresentation({
      name: 'observer-stability',
      optionsSchema: z.strictObject({}),
      present,
    });
    const presentationDefinitions = [presentation];
    const firstObserver = vi.fn();
    const secondObserver = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderTable = async (onManifest: (manifest: TableLayoutManifest) => void): Promise<void> => {
      await act(() => {
        root.render(
          <ManualTable
            rows={[
              [
                { id: 'plain', value: 'plain', presentation: { name: 'observer-stability' } },
                {
                  id: 'bordered',
                  value: 'bordered',
                  presentation: { name: 'observer-stability' },
                  layout: { borders: { bottom: { kind: 'line', width: 2 } } },
                },
              ],
            ]}
            presentationDefinitions={presentationDefinitions}
            onManifest={onManifest}
          />,
        );
      });
    };

    await renderTable(firstObserver);
    expect(observed.slice(0, 2)).toMatchObject([
      {
        rawValue: 'plain',
        value: 'plain',
        context: { cellId: 'plain', rowIndex: 0, columnIndex: 0 },
        appearance: {},
      },
      {
        rawValue: 'bordered',
        value: 'bordered',
        context: { cellId: 'bordered', rowIndex: 0, columnIndex: 1 },
        appearance: { borders: { bottom: { kind: 'line', width: 2 } } },
      },
    ]);
    const observedCount = observed.length;
    present.mockClear();
    await renderTable(secondObserver);

    expect(present).not.toHaveBeenCalled();
    expect(observed).toHaveLength(observedCount);
    expect(firstObserver).toHaveBeenCalledTimes(1);
    expect(secondObserver).not.toHaveBeenCalled();
    await act(() => root.unmount());
    container.remove();
  });

  it('passes ordered root rules through ManualTable authoring into the shared pipeline', async () => {
    const observed: Array<CellPresentationInput> = [];
    const manifests: Array<TableLayoutManifest> = [];
    const inspect = defineCellPresentation({
      name: 'rule-inspect',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed.push(input);
        return { type: 'node', position: [0, 0], text: String(input.value) };
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <ManualTable
          rows={[[{ id: 'ruled', value: 2 }]]}
          rules={[
            {
              selector: { cellIds: ['ruled'], value: { kind: 'compare', operator: 'gt', value: 1 } },
              formatter: { name: 'number', options: { specifier: '.1f' } },
              presentation: { name: 'rule-inspect' },
              appearance: {
                background: { fill: '#f3f4f6' },
                borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } },
              },
            },
          ]}
          presentationDefinitions={[inspect]}
          onManifest={manifest => manifests.push(manifest)}
        />,
      );
    });

    expect(observed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rawValue: 2,
          value: '2.0',
          context: expect.objectContaining({ cellId: 'ruled' }),
          appearance: {
            background: { fill: '#f3f4f6' },
            borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } },
            content: {
              color: '#18181b',
              nodeDefault: { font: { family: 'sans-serif', weight: 400 } },
              labelDefault: { font: { family: 'sans-serif', weight: 400 } },
            },
          },
        }),
      ]),
    );
    expect(manifests[0].borders).toContainEqual(
      expect.objectContaining({ style: expect.objectContaining({ stroke: '#2563eb', width: 2 }) }),
    );
    await act(() => root.unmount());
    container.remove();
  });

  it('preserves shared content rewrite diagnostics in React SSR', () => {
    expect(() =>
      renderToStaticMarkup(
        <ManualTable
          rows={[[{ id: 'direct', content: { type: 'node', position: [0, 0], text: 'direct' } }]]}
          rules={[{ selector: { cellIds: ['direct'] }, formatter: { name: 'identity' } }]}
        />,
      ),
    ).toThrow(/rule 0.*direct.*formatter/i);
  });
});
