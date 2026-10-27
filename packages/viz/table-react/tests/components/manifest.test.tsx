// @vitest-environment jsdom
import type { IRChild } from '@retikz/core';
import type { InputCellPresentation, TableLayoutManifest } from '@retikz/table';
import { createManualTableIR, defineCellPresentation, defineCellVisualScale } from '@retikz/table';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { strictObject } from 'zod';

import { ManualTable, Table } from '../../src';

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Table React 明显观察', () => {
  it('渲染期间不调用 onManifest', () => {
    const onManifest = vi.fn();

    renderToStaticMarkup(<ManualTable rows={[[null]]} onManifest={onManifest} />);

    expect(onManifest).not.toHaveBeenCalled();
  });

  it('提交后通知并通过序列化清单内容进行去重', async () => {
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

  it('公开由通用 Table 条目生成的 Legend 描述符种子', async () => {
    const manifests: Array<TableLayoutManifest> = [];
    const visualScale = defineCellVisualScale({
      name: 'react-manifest-palette',
      optionsSchema: strictObject({}),
      resolve: (_options, _values, context) => ({
        of: () => context.categoricalColors?.[0] ?? '#000000',
        legendForm: 'swatch',
        domain: [1],
        range: [context.categoricalColors?.[0] ?? '#000000'],
      }),
    });
    const spec = createManualTableIR({
      id: 'encoded',
      rows: [[1]],
      defaultVisual: { categorical: ['#123456'] },
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

  it('当嵌套 Table 重复根 id 时，选择确切的根产物', async () => {
    const manifests: Array<TableLayoutManifest> = [];
    const nested = createManualTableIR({ id: 'repeated', rows: [[null], [null]] });
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

  it('仅观察者身份发生变化时不重新编译或重新通知', async () => {
    const content: IRChild = { type: 'node', position: [0, 0], text: 'stable' };
    const observed: Array<InputCellPresentation> = [];
    const present = vi.fn((input: InputCellPresentation) => {
      observed.push(input);
      return content;
    });
    const presentation = defineCellPresentation({
      name: 'observer-stability',
      optionsSchema: strictObject({}),
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

  it('通过 ManualTable 编写将有序根规则传递到共享管线中', async () => {
    const observed: Array<InputCellPresentation> = [];
    const manifests: Array<TableLayoutManifest> = [];
    const inspect = defineCellPresentation({
      name: 'rule-inspect',
      optionsSchema: strictObject({}),
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
          appearance: expect.objectContaining({
            background: expect.objectContaining({ fill: '#f3f4f6' }),
            borders: expect.objectContaining({
              bottom: expect.objectContaining({ kind: 'line', stroke: '#2563eb', width: 2 }),
            }),
            content: expect.objectContaining({
              defaults: expect.objectContaining({
                style: expect.objectContaining({ color: '#18181b' }),
                node: expect.objectContaining({
                  style: expect.objectContaining({
                    font: expect.objectContaining({ family: 'sans-serif', weight: 400 }),
                  }),
                  label: expect.objectContaining({
                    font: expect.objectContaining({ family: 'sans-serif', weight: 400 }),
                  }),
                }),
                path: expect.objectContaining({
                  label: expect.objectContaining({
                    font: expect.objectContaining({ family: 'sans-serif', weight: 400 }),
                  }),
                }),
              }),
            }),
          }),
        }),
      ]),
    );
    expect(manifests[0].borders).toContainEqual(
      expect.objectContaining({ style: expect.objectContaining({ stroke: '#2563eb', width: 2 }) }),
    );

    await act(() => root.unmount());
    container.remove();
  });

  it('在 React SSR 中保留共享内容重写诊断', () => {
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
