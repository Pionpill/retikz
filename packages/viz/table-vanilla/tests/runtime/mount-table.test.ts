// @vitest-environment jsdom
import { layer, scene } from '@retikz/vanilla';
import { mount } from '@retikz/vanilla/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detailTable, embedTable, tableInputEmbedAdapter } from '../../src';

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

describe('Table Vanilla 安装运行时', () => {
  it('更新 SVG 数据，同时保留根身份并支持 Canvas 宿主', () => {
    const spec = detailTable({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });
    const tableFigure = (name: string) =>
      scene({
        layers: [layer({ id: 'content', children: [embedTable(spec, { data: { people: [{ name }] } })] })],
      });
    const svgContainer = document.createElement('div');
    const svgView = mount(svgContainer, tableFigure('Ada'), { adapters: [tableInputEmbedAdapter] });
    const svgRoot = svgView.root;

    expect(svgRoot.textContent).toContain('Ada');

    svgView.update(tableFigure('Grace'));

    expect(svgView.root).toBe(svgRoot);
    expect(svgRoot.textContent).toContain('Grace');

    const canvasContainer = document.createElement('div');
    const canvasView = mount(canvasContainer, tableFigure('Lin'), {
      renderer: 'canvas',
      adapters: [tableInputEmbedAdapter],
    });
    const canvasRoot = canvasView.root;
    canvasView.update(tableFigure('Edsger'));

    expect(canvasView.root).toBe(canvasRoot);
    expect(canvasRoot).toBeInstanceOf(HTMLCanvasElement);

    svgView.dispose();
    canvasView.dispose();
  });
});
