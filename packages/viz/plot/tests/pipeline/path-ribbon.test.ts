import type { IRChild, IRPath, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { ribbonPathDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const paths = (child: IRChild): Array<IRPath> =>
  child.type === 'path' ? [child as IRPath] : child.type === 'scope' ? (child as IRScope).children.flatMap(paths) : [];
const source = (properties: object, ribbon?: object) => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  scales: ['x', 'y'].map(name => ({ name, type: 'linear', domain: [0, 10] })),
  marks: [
    {
      type: 'path',
      properties,
      encodings: {
        steps: [
          { kind: 'move', to: [0, 0] },
          { kind: 'cubic', control1: [40, 0], control2: [60, 80], to: [100, 80] },
        ],
        ...(ribbon === undefined ? {} : { ribbon }),
      },
    },
  ],
});
const lower = (properties: object, ribbon?: object, width = 12) =>
  paths(
    lowerPlotWithDataArtifact(
      PlotSchema.parse(source(properties, ribbon)),
      {
        rows: [
          { width, end: 4 },
          { width: width * 2, end: 8 },
        ],
      },
      { textMeasurer: measureLabel },
    ).child,
  );

describe('PathMark 色带', () => {
  it('将下沉的曲线编译为与直接编写的功能区相同的 Scene', () => {
    const [actual] = lower({
      kind: 'ribbon',
      stroke: 'none',
      fill: '#336699',
      ribbon: { width: { kind: 'fixed', value: 12 } },
    });
    const direct: IRPath = {
      type: 'path',
      kind: 'ribbon',
      style: actual.style,
      kindOptions: { width: { kind: 'fixed', value: 12 } },
      children: actual.children,
    };
    const compile = (path: IRPath) =>
      compileToScene({ type: 'scene', version: 1, children: [path] }, { paths: [ribbonPathDefinition] }).scene;
    expect(compile(actual)).toEqual(compile(direct));
    expect(compile(actual).primitives.length).toBeGreaterThan(0);
  });
  it('通过显式比例映射宽度，同时保持绘图位置不变', () => {
    const spec = source({ kind: 'ribbon' }, { width: { field: 'width', scale: 'width' } });
    const parsed = PlotSchema.parse({
      ...spec,
      scales: [...spec.scales, { name: 'width', type: 'linear', domain: [0, 20], range: [0, 10] }],
    });
    const [path] = paths(
      lowerPlotWithDataArtifact(parsed, { rows: [{ width: 12 }] }, { textMeasurer: measureLabel }).child,
    );
    expect(path.kindOptions?.width).toEqual({ kind: 'fixed', value: 6 });
    expect(path.children[0]).toMatchObject({ to: [0, 0] });
  });
  it('向每行功能区实例提供字段填充', () => {
    const spec = source({ kind: 'ribbon' }, { width: 'width' });
    const parsed = PlotSchema.parse({
      ...spec,
      marks: [{ ...spec.marks[0], encodings: { ...spec.marks[0].encodings, fill: 'paint' } }],
    });
    const result = paths(
      lowerPlotWithDataArtifact(
        parsed,
        {
          rows: [
            { width: 8, paint: 'a' },
            { width: 9, paint: 'b' },
          ],
        },
        { textMeasurer: measureLabel },
      ).child,
    );
    expect(result[0].style?.fill).toBeDefined();
    expect(result[0].style?.fill).not.toEqual(result[1].style?.fill);
  });
  it('使用每个系列的第一个顶点作为其色带宽度', () => {
    const spec = source({ kind: 'ribbon' });
    const parsed = PlotSchema.parse({
      ...spec,
      marks: [
        {
          type: 'path',
          properties: { kind: 'ribbon', fill: '#336699' },
          encodings: {
            position: { x: { field: 'x' }, y: { field: 'y' } },
            series: 'series',
            ribbon: { width: 'width' },
          },
        },
      ],
    });
    const result = paths(
      lowerPlotWithDataArtifact(
        parsed,
        {
          rows: [
            { x: 1, y: 2, width: 8, series: 'a' },
            { x: 4, y: 6, width: 20, series: 'a' },
          ],
        },
        { textMeasurer: measureLabel },
      ).child,
    );
    expect(result).toHaveLength(1);
    expect(result[0].kindOptions?.width).toEqual({ kind: 'fixed', value: 8 });
  });
  it('绑定每行的宽度并保留编写的中心线', () => {
    const result = lower({ kind: 'ribbon' }, { width: 'width' });
    expect(result).toHaveLength(2);
    expect(result.map(path => path.kindOptions?.width)).toEqual([
      { kind: 'fixed', value: 12 },
      { kind: 'fixed', value: 24 },
    ]);
    expect(result[0].kind).toBe('ribbon');
    expect(result[0].children[1]).toMatchObject({ kind: 'cubic', control1: [40, 0] });
  });
  it('使用单个常量实例并将宿主标签移动到功能区选项中', () => {
    const result = lower({
      kind: 'ribbon',
      ribbon: { width: { kind: 'profile', name: 'custom', params: { height: 8 } } },
      label: { text: 'flow', placement: 'inside' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].kindOptions).toMatchObject({
      width: { kind: 'profile', name: 'custom', params: { height: 8 } },
      label: { text: 'flow', placement: 'inside' },
    });
    expect(result[0].label).toBeUndefined();
  });
  it('支持锥度装订和零宽度，无需更改规则', () => {
    expect(lower({ kind: 'ribbon' }, { width: 'width', endWidth: 'end' }, 0)[0].kindOptions?.width).toEqual({
      kind: 'taper',
      start: 0,
      end: 4,
    });
  });
  it('拒绝负解析宽度', () => {
    expect(() => lower({ kind: 'ribbon' }, { width: 'width' }, -1)).toThrow(/width/i);
  });
  it('拒绝源边界处不兼容的几何形状和宽度声明', () => {
    for (const properties of [
      { kind: 'stroke', ribbon: { width: { kind: 'fixed', value: 2 } } },
      { kind: 'ribbon' },
      { kind: 'ribbon', cornerRadius: 3, ribbon: { width: { kind: 'fixed', value: 2 } } },
    ])
      expect(PlotSchema.safeParse(source(properties)).success).toBe(false);
    expect(
      PlotSchema.safeParse(
        source({ kind: 'ribbon', ribbon: { width: { kind: 'profile', name: 'bulge' } } }, { width: 'width' }),
      ).success,
    ).toBe(false);
  });
});
