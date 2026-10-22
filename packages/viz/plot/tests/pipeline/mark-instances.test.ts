import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import type { LowerPlotsOptions } from '../../src/pipeline/expand';
import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const geometry = (child: IRChild): Array<IRNode | IRPath> => {
  if (child.type === 'scope') return (child as IRScope).children.flatMap(geometry);
  if ((child.type === 'node' || child.type === 'path') && child.id !== 'chart.plotArea')
    return [child as IRNode | IRPath];
  return [];
};

const render = (mark: unknown, rows: Array<{ x: number; y: number }>, options: LowerPlotsOptions = {}) => {
  const source = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'chart',
    data: { reference: 'rows' },
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    scales: [
      { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
      { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
    ],
    marks: [mark],
  });
  return geometry(lowerPlot(source, { rows }, { textMeasurer: measureLabel, ...options }));
};

describe('Mark instance sources', () => {
  const rows = [
    { x: 2, y: 3 },
    { x: 8, y: 7 },
  ];
  const fixedPoint = {
    type: 'point',
    encodings: { position: { x: { value: 5 }, y: { value: 5 } } },
  };

  it('renders one constant point with an empty or populated source', () => {
    expect(render(fixedPoint, [])).toHaveLength(1);
    expect(render(fixedPoint, rows)).toHaveLength(1);
    expect(render({ ...fixedPoint, transforms: [] }, rows)).toHaveLength(1);
  });

  it('broadcasts constant coordinates over field-bound records without an empty-result fallback', () => {
    const mark = { type: 'point', encodings: { position: { x: { field: 'x' }, y: { value: 5 } } } };
    const points = render(mark, rows);
    expect(points).toHaveLength(2);
    expect(points[0]).not.toEqual(points[1]);
    expect(render(mark, [])).toHaveLength(0);
  });

  it('renders one complete edge-to-edge path per result record', () => {
    const mark = {
      type: 'path',
      encodings: {
        from: { x: { edge: 'start' }, y: { field: 'y' } },
        to: { x: { edge: 'end' }, y: { field: 'y' } },
      },
    };
    expect(render(mark, rows)).toHaveLength(2);
    expect(render(mark, [])).toHaveLength(0);
  });

  it('keeps field-bound vertices in a single path', () => {
    const mark = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    expect(render(mark, rows).filter(child => child.type === 'path')).toHaveLength(1);
  });

  it('passes a real single instance to anchor generators without datum metadata', () => {
    const generator = vi.fn(() => 'fixed');
    const points = render({ ...fixedPoint, properties: { anchorId: { generator: 'fixed' } } }, rows, {
      anchorIdGenerators: { fixed: generator },
    });
    expect(generator).toHaveBeenCalledTimes(1);
    expect(generator.mock.calls[0]).toEqual([
      { kind: 'single' },
      expect.objectContaining({ plotId: 'chart', markIndex: 0 }),
    ]);
    expect(points[0]).toMatchObject({ id: 'chart.fixed' });
    expect(points[0]).not.toHaveProperty('meta.transformedIndex');
  });

  it('rejects index templates on single instances instead of inventing a row index', () => {
    expect(() => render({ ...fixedPoint, properties: { anchorId: { template: 'point.{index}' } } }, rows)).toThrow(
      /index.*row/i,
    );
  });

  it('uses template fields as row dependencies and rejects duplicate generated IDs', () => {
    const mark = { ...fixedPoint, properties: { anchorId: { template: 'point.{field:x}' } } };
    expect(render(mark, rows).map(point => point.id)).toEqual(['point.2', 'point.8']);
    expect(render(mark, [])).toHaveLength(0);
    expect(() => render(mark, [rows[0], rows[0]])).toThrow(/duplicate anchor/i);
  });
});
