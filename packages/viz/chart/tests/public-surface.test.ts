import { describe, expect, expectTypeOf, it } from 'vitest';

// @ts-expect-error Chart resolver 结果必须保持 owner-private
import type { ChartResolution } from '../src';
// @ts-expect-error infrastructure fixture 类型必须保持 owner-private
import type { InfrastructureChartSpec } from '../src';
// @ts-expect-error recipe 基础类型必须保持 owner-private
import type { InternalChartSpecBound } from '../src';
import type { ChartContributionSourceValue, IRChartInspection, IRChartInspectionMember, IRChartShared } from '../src';

import * as chart from '../src';

describe('@retikz/chart package root', () => {
  it('拒绝 owner-private 类型从包根导入', () => {
    expectTypeOf<ChartResolution>();
    expectTypeOf<InfrastructureChartSpec>();
    expectTypeOf<InternalChartSpecBound>();
  });

  it('只暴露 shared 与 inspection 的八个允许符号', () => {
    expect(Object.keys(chart).sort()).toEqual([
      'ChartContributionSource',
      'ChartInspectionMemberSchema',
      'ChartInspectionSchema',
      'ChartSharedSchema',
    ]);
  });

  it('公开四个 schema 派生类型', () => {
    const shared: IRChartShared = { data: { reference: 'rows' } };
    const source: ChartContributionSourceValue = 'type-default';
    const member: IRChartInspectionMember = {
      target: 'mark.main',
      kind: 'mark',
      core: true,
      value: { type: 'point' },
      sources: [{ kind: source, path: '$recipe/scatter/mark.main' }],
    };
    const inspection: IRChartInspection = {
      chart: { type: 'scatter' },
      plot: {},
      members: [member],
    };

    expect({ shared, inspection }).toBeDefined();
  });
});
