import { describe, expect, expectTypeOf, it } from 'vitest';

// @ts-expect-error Chart resolver 结果必须保持 owner-private
import type { ChartResolution } from '../src';
// @ts-expect-error infrastructure fixture 类型必须保持 owner-private
import type { InfrastructureChartSpec } from '../src';
// @ts-expect-error recipe 基础类型必须保持 owner-private
import type { InternalChartSpecBound } from '../src';
import type {
  ChartContributionSourceValue,
  ChartStyleAuthoredOverrideValue,
  ChartStyleTokenSourceValue,
  ChartStyleTokenValue,
  ChartStyleValue,
  ChartThemeModeValue,
  IRChartInspection,
  IRChartInspectionMember,
  IRChartResolvedStyleTokens,
  IRChartShared,
  IRChartStyleSurface,
  IRChartStyleTokenOverrides,
} from '../src';

import * as chart from '../src';

describe('@retikz/chart package root', () => {
  it('拒绝 owner-private 类型从包根导入', () => {
    expectTypeOf<ChartResolution>();
    expectTypeOf<InfrastructureChartSpec>();
    expectTypeOf<InternalChartSpecBound>();
  });

  it('只暴露 shared、inspection 与 theme 数据契约', () => {
    expect(Object.keys(chart).sort()).toEqual([
      'ChartContributionSource',
      'ChartInspectionMemberSchema',
      'ChartInspectionSchema',
      'ChartResolvedStyleTokensSchema',
      'ChartSharedSchema',
      'ChartStyle',
      'ChartStyleAuthoredOverride',
      'ChartStyleSurfaceSchema',
      'ChartStyleToken',
      'ChartStyleTokenOverridesSchema',
      'ChartStyleTokenSource',
      'ChartThemeMode',
    ]);
    expect(chart.ChartStyleTokenSource).toEqual({ Preset: 'preset', StyleToken: 'style-token' });
    expect(chart.ChartStyleAuthoredOverride).toEqual({ Colors: 'colors', Theme: 'theme' });
  });

  it('公开 schema 派生类型而不公开 resolver 或 recipe', () => {
    const style: ChartStyleValue = 'neutral';
    const mode: ChartThemeModeValue = 'dark';
    const token: ChartStyleTokenValue = 'axis.enabled';
    const tokenSource: ChartStyleTokenSourceValue = 'style-token';
    const authoredOverride: ChartStyleAuthoredOverrideValue = 'theme';
    const overrides: IRChartStyleTokenOverrides = { [token]: false };
    const surface: IRChartStyleSurface = { style, themeMode: mode, styleTokens: overrides };
    const shared: IRChartShared = { data: { reference: 'rows' }, ...surface };
    const source: ChartContributionSourceValue = 'type-default';
    const member: IRChartInspectionMember = {
      target: 'mark.main',
      kind: 'mark',
      core: true,
      value: { type: 'point' },
      sources: [{ kind: source, path: '$recipe/scatter/mark.main' }],
    };
    expectTypeOf<IRChartResolvedStyleTokens>().toMatchTypeOf<IRChartInspection['style']['tokens']>();
    expectTypeOf<IRChartInspectionMember>().toMatchTypeOf<typeof member>();

    expect({ shared, member, tokenSource, authoredOverride }).toBeDefined();
  });
});
