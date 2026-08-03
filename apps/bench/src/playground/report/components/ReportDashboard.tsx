import type { FC } from 'react';

import type { LabPolicyResult } from '../../modules/kernel';

import { ComparisonChart } from './ComparisonChart';
import { MetricsSummary } from './MetricsSummary';

/** 基准报告主仪表盘属性 */
export type ReportDashboardProps = Readonly<{
  results: ReadonlyArray<LabPolicyResult>;
  compact?: boolean;
}>;

/** 在统一 surface 中组合关键指标与策略图表 */
export const ReportDashboard: FC<ReportDashboardProps> = props => {
  const { results, compact = false } = props;
  return (
    <section data-slot="lab-report-dashboard" className="lab-panel overflow-hidden">
      <MetricsSummary results={results} compact={compact} />
      <ComparisonChart results={results} compact={compact} />
    </section>
  );
};
