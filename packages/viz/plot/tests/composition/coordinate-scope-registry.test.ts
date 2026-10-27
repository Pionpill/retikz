import type { IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const rows = [
  { month: 0, value: 10 },
  { month: 1, value: 20 },
  { month: 2, value: 15 },
];

const coordinateShorthandSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yValue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
  marks: [
    {
      contributeToDomain: true,
      type: 'point',
      encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
    },
  ],
  guides: [{ type: 'axis', dimension: 'x' }],
};

const compositionSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yValue' },
  ],
  composition: {
    defaultView: 'timeline',
    views: [
      {
        id: 'timeline',
        coordinate: { type: 'cartesian1D', x: 'xMonth' },
        placement: { kind: 'root' },
      },
      {
        id: 'xy',
        coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
        placement: { kind: 'overlay', target: 'timeline' },
      },
    ],
  },
  marks: [
    { contributeToDomain: true, type: 'point', encodings: { position: { x: { field: 'month' } } } },
    {
      contributeToDomain: true,
      type: 'point',
      coordinateView: 'xy',
      encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', coordinateView: 'xy' },
  ],
};

const parsePlotIR = (spec: unknown): IRPlot => PlotSchema.parse(spec);

const parsedComposition = (): IRPlot => parsePlotIR(compositionSpec);

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlotWithDataArtifact(
    spec,
    { sales: rows },
    { layout: { width: 480, height: 300 }, textMeasurer: measureLabel },
  ).child as IRScope;
};

describe('坐标组合注册表 schema', () => {
  it('兼容坐标简写解析', () => {
    expect(parsePlotIR(coordinateShorthandSpec)).toEqual(coordinateShorthandSpec);
  });

  it('组合范围注册表在没有顶级坐标的情况下进行解析', () => {
    expect(parsePlotIR(compositionSpec)).toEqual(compositionSpec);
  });

  it('通过 json 进行组合范围注册表往返', () => {
    const json = JSON.parse(JSON.stringify(compositionSpec));

    expect(parsePlotIR(json)).toEqual(compositionSpec);
  });

  it('保留标记及坐标轴的坐标作用域字段', () => {
    const parsed = parsedComposition();

    expect(parsed.marks[1]).toMatchObject({ coordinateView: 'xy' });
    expect(parsed.guides?.[1]).toMatchObject({ coordinateView: 'xy' });
  });

  it('单个显式根范围与 schema 契约匹配', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
      marks: [
        {
          contributeToDomain: true,
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    };

    expect(parsePlotIR(spec)).toEqual(spec);
  });

  it('自定义坐标范围 schemaschema 传递和往返行程', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'arch',
        views: [{ id: 'arch', coordinate: { type: 'arch', x: 'xMonth', archHeight: 30 } }],
      },
      marks: [{ contributeToDomain: true, type: 'point', encodings: { position: { x: { field: 'month' } } } }],
      guides: [],
    };

    expect(parsePlotIR(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('空的组合范围被拒绝', () => {
    const spec = { ...compositionSpec, composition: { defaultView: 'main', views: [] } };

    expect(() => parsePlotIR(spec)).toThrow();
  });

  it('重复范围 ID 被拒绝', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/duplicate coordinate view/i);
  });

  it('缺少默认范围被拒绝', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'missing',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/defaultView/);
  });

  it('缺少标记坐标范围被拒绝', () => {
    const spec = {
      ...compositionSpec,
      marks: [
        {
          contributeToDomain: true,
          type: 'point',
          coordinateView: 'missing',
          encodings: { position: { x: { field: 'month' } } },
        },
      ],
    };

    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('缺少轴坐标范围被拒绝', () => {
    const spec = {
      ...compositionSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateView: 'missing' }],
    };

    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('兼容标记坐标范围必须引用隐式默认范围', () => {
    const spec = {
      ...coordinateShorthandSpec,
      marks: [
        {
          contributeToDomain: true,
          type: 'point',
          coordinateView: 'missing',
          encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
        },
      ],
    };

    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('兼容轴坐标范围必须引用隐式默认范围', () => {
    const spec = {
      ...coordinateShorthandSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateView: 'missing' }],
    };

    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('坐标和组合共存被拒绝', () => {
    const spec = { ...compositionSpec, coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } };

    expect(() => parsePlotIR(spec)).toThrow(/composition/);
  });

  it('覆盖目标必须引用注册范围', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
          {
            id: 'overlay',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'missing' },
          },
        ],
      },
      marks: [
        {
          contributeToDomain: true,
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    };

    expect(() => parsePlotIR(spec)).toThrow(/target/);
  });

  it('覆盖目标无法引用自身', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          {
            id: 'main',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'main' },
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/target/);
  });

  it('轨道布置需要轨道视图', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        arrangements: [
          {
            kind: 'tracks',
            id: 'shared-x',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            sharedRoles: ['x'],
            tracks: [],
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow();
  });
});

describe('坐标合成注册表下沉', () => {
  it('标记和轴下沉使用其绑定坐标范围', () => {
    const outer = expandOf(parsedComposition());

    expect(outer.children.length).toBeGreaterThanOrEqual(4);
  });

  it('轴范围绑定可以使用仅存在于绑定范围上的维度', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'line',
        views: [
          { id: 'line', coordinate: { type: 'cartesian1D', x: 'xMonth' } },
          {
            id: 'plane',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'line' },
          },
        ],
      },
      marks: [
        { contributeToDomain: true, type: 'point', encodings: { position: { x: { field: 'month' } } } },
        {
          contributeToDomain: true,
          type: 'point',
          coordinateView: 'plane',
          encodings: { position: { x: { field: 'month' }, y: { field: 'value' } } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'y', coordinateView: 'plane' }],
    };

    expect(() => expandOf(parsePlotIR(spec))).not.toThrow();
  });
});
