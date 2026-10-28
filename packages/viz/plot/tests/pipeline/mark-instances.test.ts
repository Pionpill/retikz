import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import type { PlotsLoweringOptions } from '../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const geometry = (child: IRChild): Array<IRNode | IRPath> => {
  if (child.type === 'scope') return (child as IRScope).children.flatMap(geometry);
  if ((child.type === 'node' || child.type === 'path') && child.id !== 'chart.plotArea')
    return [child as IRNode | IRPath];
  return [];
};

const render = (mark: unknown, rows: Array<{ x: number; y: number }>, options: PlotsLoweringOptions = {}) => {
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
  return geometry(lowerPlotWithDataArtifact(source, { rows }, { textMeasurer: measureLabel, ...options }).child);
};

describe('标记实例源', () => {
  const rows = [
    { x: 2, y: 3 },
    { x: 8, y: 7 },
  ];
  const fixedPoint = {
    type: 'point',
    encodings: { position: { x: { value: 5 }, y: { value: 5 } } },
  };

  it('使用空源或填充源渲染一个常量点', () => {
    expect(render(fixedPoint, [])).toHaveLength(1);
    expect(render(fixedPoint, rows)).toHaveLength(1);
    expect(render({ ...fixedPoint, transforms: [] }, rows)).toHaveLength(1);
  });

  it('在字段绑定记录上广播常量坐标，没有空结果回退', () => {
    const mark = { type: 'point', encodings: { position: { x: { field: 'x' }, y: { value: 5 } } } };
    const points = render(mark, rows);
    expect(points).toHaveLength(2);
    expect(points[0]).not.toEqual(points[1]);
    expect(render(mark, [])).toHaveLength(0);
  });

  it('为每个结果记录渲染一条完整的边到边路径', () => {
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

  it('将字段绑定顶点保留在单个路径中', () => {
    const mark = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    expect(render(mark, rows).filter(child => child.type === 'path')).toHaveLength(1);
  });

  it('将真实的单个实例传递给锚点生成器，而无需数据元数据', () => {
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

  it('拒绝单个实例上的索引模板，而不是发明行索引', () => {
    expect(() => render({ ...fixedPoint, properties: { anchorId: { template: 'point.{index}' } } }, rows)).toThrow(
      /index.*row/i,
    );
  });

  it('使用模板字段作为行依赖项并拒绝重复生成的 ID', () => {
    const mark = { ...fixedPoint, properties: { anchorId: { template: 'point.{field:x}' } } };
    expect(render(mark, rows).map(point => point.id)).toEqual(['point.2', 'point.8']);
    expect(render(mark, [])).toHaveLength(0);
    expect(() => render(mark, [rows[0], rows[0]])).toThrow(/duplicate anchor/i);
  });
});
