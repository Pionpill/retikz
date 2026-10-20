import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BenchmarkReport } from './types';

/** 将报告中的外部文本作为纯文本展示，避免被解释为 HTML */
const escapeCell = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('|', '&#124;')
    .replace(/\r?\n/g, ' ');

/** 毫秒值转换为微秒并保留三位小数，不改变原始统计和预算判断 */
const formatDuration = (value: number | undefined): string => (value === undefined ? '—' : (value * 1000).toFixed(3));

/** 样本数按十进制 K/M 缩写，原始数量仍保存在 JSON 中 */
const formatSamples = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

/** 展示统计与性能验收；用例执行通过不等于性能达标 */
export const formatReport = (report: BenchmarkReport, title = '单元性能测试报告'): string => {
  const executionLabels = { passed: '通过', failed: '失败', skipped: '已跳过', pending: '未执行' };
  const assessmentLabels = {
    'report-only': '仅报告',
    passed: '达标',
    exceeded: '超限',
    'not-comparable': '不可比较',
    'execution-failed': '执行失败',
  };
  const severityLabels = { warn: '告警', error: '阻断' };
  const metricLabels = { mean: '均值', p50: 'P50', p90: 'P90', p99: 'P99' };
  const reasonLabels: Record<string, string> = {
    'Scenario failed': '场景执行失败',
    'Scenario did not produce a complete measurement': '场景未产生完整测量数据',
    'Environment mismatch': '执行环境不匹配',
    'Baseline unavailable': '基线不可用',
    'Baseline run failed': '基线运行失败',
    'Baseline environment mismatch': '基线执行环境不匹配',
    'Baseline scenario unavailable or failed': '基线场景不可用或执行失败',
    'Invalid relative budget': '相对预算无效',
    'Baseline duration is zero': '基线耗时为零',
    'Invalid duration limit': '耗时上限无效',
  };
  const rows = report.scenarios.map(scenario => {
    const stats = scenario.statistics;
    const durations = [stats?.mean, stats?.p50, stats?.p90, stats?.p99].map(formatDuration);
    const assessment = scenario.assessment;
    const reason = assessment.reason ?? scenario.errors.join('; ');
    const limit =
      assessment.metric && assessment.limitMs !== undefined
        ? `${metricLabels[assessment.metric]}: ${formatDuration(assessment.limitMs)}`
        : '—';
    const remarks = [
      assessmentLabels[assessment.status],
      assessment.severity ? severityLabels[assessment.severity] : '',
      reasonLabels[reason] ?? reason,
    ]
      .filter(Boolean)
      .join('；');
    return `| ${escapeCell(scenario.id)} | ${executionLabels[scenario.execution]} | ${stats ? formatSamples(stats.samples) : '—'} | ${durations.join(' | ')} | ${limit} | ${escapeCell(remarks)} |`;
  });
  return [
    `# ${escapeCell(title)}`,
    '',
    `采样时间：${escapeCell(report.createdAt)}`,
    `提交：${escapeCell(report.source.commit)}；工作区存在未提交改动：${report.source.dirty ? '是' : '否'}；源码 SHA-256：${escapeCell(report.source.sourceHash)}`,
    '',
    '耗时单位为微秒（μs）/次调用。P50 为中位数；P90/P99 使用最近秩法（nearest-rank）计算。“仅报告”不代表性能达标。',
    '耗时展示保留 3 位小数并四舍五入；展示位数不代表实际测量精度。JSON 和预算配置仍使用毫秒。',
    '',
    '## 执行环境',
    '',
    '```json',
    JSON.stringify(report.environment, null, 2),
    '```',
    '',
    '## 测量结果',
    '',
    '| 场景 | 状态 | 样本数 | 均值（μs） | P50（μs） | P90（μs） | P99（μs） | 上限 | 备注 |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |',
    ...rows,
    '',
    '## 运行错误',
    '',
    ...(report.errors.length ? report.errors.map(error => `- ${escapeCell(error)}`) : ['无']),
    '',
  ].join('\n');
};

/** 每次写入独立目录，保留失败结果且不覆盖历史或基线 */
export const writeReport = async (
  root: string,
  report: BenchmarkReport,
  title = '单元性能测试报告',
): Promise<string> => {
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, `${report.createdAt.replaceAll(':', '-')}-`));
  await writeFile(join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(join(directory, 'report.md'), formatReport(report, title), 'utf8');
  return directory;
};
