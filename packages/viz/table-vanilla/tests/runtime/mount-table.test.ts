// @vitest-environment jsdom
import { figure, layer, mount } from '@retikz/vanilla';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTableAdapter, detailTable, embedTable } from '../../src';

const createCanvasContext = (): CanvasRenderingContext2D => {
  const target: Record<string | symbol, unknown> = {
    canvas: null,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
  };
  return new Proxy(target, {
    get(value, property) {
      if (property in value) return value[property];
      return () => undefined;
    },
    set(value, property, next) {
      value[property] = next;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => createCanvasContext());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Table Vanilla mounted runtime', () => {
  it('updates SVG data while preserving root identity and supports the Canvas host', () => {
    const adapter = createTableAdapter();
    const spec = detailTable({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });
    const tableFigure = (name: string) =>
      figure({
        layers: [layer('content', [embedTable('people-panel', spec, { data: { people: [{ name }] } })])],
      });
    const svgContainer = document.createElement('div');
    const svgView = mount(svgContainer, tableFigure('Ada'), { adapters: [adapter] });
    const svgRoot = svgView.root;

    expect(svgRoot.textContent).toContain('Ada');
    svgView.update(tableFigure('Grace'));
    expect(svgView.root).toBe(svgRoot);
    expect(svgRoot.textContent).toContain('Grace');

    const canvasContainer = document.createElement('div');
    const canvasView = mount(canvasContainer, tableFigure('Lin'), { renderer: 'canvas', adapters: [adapter] });
    const canvasRoot = canvasView.root;
    canvasView.update(tableFigure('Edsger'));
    expect(canvasView.root).toBe(canvasRoot);
    expect(canvasRoot).toBeInstanceOf(HTMLCanvasElement);

    svgView.dispose();
    canvasView.dispose();
  });
});
