// @vitest-environment jsdom
import type { IRChild } from '@retikz/core';
import type { TableLayoutManifest } from '@retikz/table';

import { createManualTableSpec, defineCellPresentation } from '@retikz/table';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ManualTable } from '../../src';

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
    const present = vi.fn(() => content);
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
            rows={[[{ value: 'stable', presentation: { name: 'observer-stability' } }]]}
            presentationDefinitions={presentationDefinitions}
            onManifest={onManifest}
          />,
        );
      });
    };

    await renderTable(firstObserver);
    present.mockClear();
    await renderTable(secondObserver);

    expect(present).not.toHaveBeenCalled();
    expect(firstObserver).toHaveBeenCalledTimes(1);
    expect(secondObserver).not.toHaveBeenCalled();
    await act(() => root.unmount());
    container.remove();
  });
});
