import { summarizeLatency } from '../../../../scripts/benchmarks/statistics';
import type { BenchmarkReport } from '../../../../scripts/benchmarks/types';

/** 分段中位数分别从配对原始样本计算，超限提示只定位主耗时链路 */
export const formatIntegrationPhases = (report: BenchmarkReport) => {
  if (!report.scenarios.some(scenario => scenario.measurement?.sampleTimingsMs?.length)) return '';
  const rows = [
    '',
    '## 集成阶段耗时（P50，ms）',
    '',
    '按公开调用逐样本记录；其他 = 总耗时 − 计算 − 渲染。各列独立取中位数，不要求相加等于总 P50。总耗时列不含计时器外侧的基准驱动。',
    '',
    '| 场景 | 总耗时 | 计算 | 渲染 | 其他 | 预算与定位 |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const scenario of report.scenarios) {
    const samples = scenario.measurement?.sampleTimingsMs;
    if (!samples?.length) continue;
    const median = (key: string) => summarizeLatency(samples.map(s => s[key])).p50;
    const compute = median('compute'),
      render = median('render'),
      other = median('other');
    const owner =
      compute >= render && compute >= other
        ? '计算占时最大：Reconciler / Core（含 Math、Foundation），尚未区分具体包'
        : render >= other
          ? '渲染占时最大：Render 后端及其同步宿主调用，尚未定位内部热点'
          : '其他占时最大：核查 Vanilla 宿主接线及未细分工作，不能直接归责';
    const verdict =
      scenario.assessment.status === 'exceeded'
        ? '超预算；' + owner
        : scenario.assessment.status === 'passed'
          ? '达标'
          : scenario.assessment.status;
    rows.push(
      '| ' +
        [
          scenario.id,
          median('total').toFixed(2),
          compute.toFixed(2),
          render.toFixed(2),
          other.toFixed(2),
          verdict,
        ].join(' | ') +
        ' |',
    );
  }
  return rows.join('\n') + '\n';
};
