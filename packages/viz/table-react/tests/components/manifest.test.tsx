// @vitest-environment jsdom
import type { TableLayoutManifest } from '@retikz/table';

import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    renderToStaticMarkup(<ManualTable rows={1} columns={1} cells={[]} onManifest={onManifest} />);

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
        root.render(<ManualTable rows={rows} columns={1} cells={[]} width={width} onManifest={onManifest} />);
      });
    };

    await renderTable(1, 200);
    await renderTable(1, 320);
    await renderTable(2, 320);

    expect(manifests).toHaveLength(2);
    expect(manifests[0].bounds).toEqual({ x: 0, y: 0, width: 120, height: 32 });
    expect(manifests[1].bounds).toEqual({ x: 0, y: 0, width: 120, height: 64 });

    await act(() => root.unmount());
    container.remove();
  });
});
