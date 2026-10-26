import { BendDirection } from '@retikz/core';
import {
  BuiltinRegressionMethod,
  BuiltinFieldOrderMode,
  DataSortOrder,
  BuiltinReducerOperationKind,
  RowSelectorTie,
  BuiltinSelectorOperationKind,
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  TransformSchema,
} from '@retikz/data';
import { RibbonAlignment, RibbonTaperInterpolation } from '@retikz/extension';
import {
  AxisLineExtentTarget,
  AxisTitleBaseline,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  PolarInterpolation,
  PositionScaleContinuity,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
} from '@retikz/plot';
import { describe, expect, it } from 'vitest';

describe('schema 词汇常量', () => {
  it('将绘图变换和数据词汇导出为 const 对象', () => {
    expect(Object.values(DataSortOrder).sort()).toEqual(['ascending', 'descending']);
    expect(Object.values(RowSelectorTie).sort()).toEqual(['all', 'first', 'last']);
    expect(Object.values(BuiltinReducerOperationKind).sort()).toEqual([
      'count',
      'extent',
      'max',
      'mean',
      'median',
      'min',
      'quantile',
      'quantile-band',
      'sum',
    ]);
    expect(Object.values(BuiltinSelectorOperationKind).sort()).toEqual([
      'bottom',
      'first',
      'last',
      'max',
      'min',
      'nth',
      'outside-quantile-band',
      'top',
    ]);
    expect(Object.values(BuiltinFieldOrderMode).sort()).toEqual([
      'appearance',
      'ascending',
      'descending',
      'naturalAscending',
      'naturalDescending',
    ]);
  });

  it('从其所属模块导出封闭图 schema 词汇', () => {
    expect(Object.values(CoordinateViewPlacementKind).sort()).toEqual(['overlay', 'root', 'slot']);
    expect(Object.values(CoordinateArrangementKind).sort()).toEqual(['facet', 'tracks']);
    expect(Object.values(AxisLineExtentTarget)).toEqual(['plotArea']);
    expect(Object.values(AxisTitleBaseline).sort()).toEqual(['bottom', 'middle', 'top']);
    expect(Object.values(PairMeasureOperationKind)).toEqual(['difference']);
    expect(Object.values(NormalizeBasis).sort()).toEqual(['fraction', 'percent']);
    expect(Object.values(JitterAxis).sort()).toEqual(['both', 'x', 'y']);
    expect(Object.values(DensityBandwidthKind).sort()).toEqual(['silverman', 'value']);
    expect(Object.values(BuiltinRegressionMethod)).toEqual([
      'linear',
      'quadratic',
      'polynomial',
      'logarithmic',
      'exponential',
      'power',
    ]);
    expect(Object.values(RelationRouteStepKind).sort()).toEqual(['bend', 'cubic', 'curve', 'fold', 'line', 'move']);
    expect(Object.values(RelationRoutingKind).sort()).toEqual(['bend', 'line', 'orthogonal']);
    expect(Object.values(RelationOrthogonalLabelStep).sort()).toEqual(['last', 'main']);
    expect(Object.values(PolarInterpolation).sort()).toEqual(['chord', 'polar']);
    expect(Object.values(PositionScaleContinuity).sort()).toEqual(['continuous', 'discrete']);
  });

  it('重用关系路由和功能区选项的核心路径词汇表', () => {
    expect(Object.values(BendDirection).sort()).toEqual(['left', 'right']);
    expect(Object.values(RibbonTaperInterpolation).sort()).toEqual(['linear', 'smooth']);
    expect(Object.values(RibbonAlignment).sort()).toEqual(['center', 'left', 'right']);
  });

  it('在转换 schema 解析中使用共享词汇值', () => {
    expect(
      TransformSchema.parse({
        kind: 'select',
        params: {
          selector: {
            kind: BuiltinSelectorOperationKind.Top,
            by: 'value',
            n: 1,
            tie: RowSelectorTie.All,
          },
        },
      }),
    ).toEqual({
      kind: 'select',
      params: {
        selector: {
          kind: 'top',
          by: 'value',
          n: 1,
          tie: 'all',
        },
      },
    });
  });
});
